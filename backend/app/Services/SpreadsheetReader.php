<?php

namespace App\Services;

use RuntimeException;
use ZipArchive;

/**
 * Reads .xlsx (first sheet) and .csv files without any Composer package.
 * Needs PHP's built-in "zip" extension for .xlsx (enabled by default in XAMPP).
 */
class SpreadsheetReader
{
    /** canonical column => accepted heading spellings (lower-case, letters/digits only) */
    private const ALIASES = [
        'pf_number'   => ['pfnumber', 'pfno', 'pf', 'pfnum', 'pfid', 'staffid', 'staffno'],
        'name'        => ['name', 'fullname', 'staffname'],
        'department'  => ['department', 'dept'],
        'faculty'     => ['faculty', 'school', 'college'],
        'designation' => ['designation', 'rank', 'position', 'title', 'jobtitle'],
        'email'       => ['email', 'emailaddress', 'mail'],
        'phone'       => ['phone', 'phonenumber', 'mobile', 'telephone'],
        'password'    => ['password', 'defaultpassword'],
    ];

    /** @return array<int, array{row:int, data:array<string,string>}> */
    public function read(string $path, string $extension): array
    {
        $matrix = strtolower($extension) === 'xlsx' ? $this->readXlsx($path) : $this->readCsv($path);
        if (!$matrix) {
            throw new RuntimeException('The file is empty.');
        }
        ksort($matrix);

        $headerRow = array_key_first($matrix);
        $map = [];
        foreach ($matrix[$headerRow] as $col => $text) {
            $norm = preg_replace('/[^a-z0-9]/', '', strtolower(trim((string) $text)));
            foreach (self::ALIASES as $canonical => $aliases) {
                if ($norm === str_replace('_', '', $canonical) || in_array($norm, $aliases, true)) {
                    $map[$col] = $canonical;
                    break;
                }
            }
        }
        if (!in_array('pf_number', $map, true) || !in_array('name', $map, true)) {
            throw new RuntimeException('The first row must contain column headings, including at least "PF Number" and "Name".');
        }

        $rows = [];
        foreach ($matrix as $rowNum => $cells) {
            if ($rowNum === $headerRow) {
                continue;
            }
            $data = [];
            foreach ($map as $col => $canonical) {
                $data[$canonical] = trim((string) ($cells[$col] ?? ''));
            }
            if (implode('', $data) === '') {
                continue; // blank line
            }
            $rows[] = ['row' => $rowNum, 'data' => $data];
        }
        return $rows;
    }

    private function readCsv(string $path): array
    {
        $h = fopen($path, 'r');
        if (!$h) {
            throw new RuntimeException('Could not open the file.');
        }
        $first = preg_replace('/^\xEF\xBB\xBF/', '', (string) fgets($h));
        rewind($h);
        $commas = substr_count($first, ',');
        $delim = substr_count($first, ';') > $commas ? ';' : (substr_count($first, "\t") > $commas ? "\t" : ',');

        $matrix = [];
        $n = 0;
        while (($line = fgetcsv($h, 0, $delim, '"', '\\')) !== false) {
            $n++;
            if ($line === [null]) {
                continue;
            }
            if ($n === 1) {
                $line[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $line[0]);
            }
            $matrix[$n] = $line;
        }
        fclose($h);
        return $matrix;
    }

    private function readXlsx(string $path): array
    {
        if (!class_exists(ZipArchive::class)) {
            throw new RuntimeException('PHP "zip" extension is off. In php.ini remove the ";" before extension=zip and restart.');
        }
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException('Could not open the Excel file. Is it a real .xlsx file?');
        }

        $shared = [];
        if (($xml = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
            $sx = simplexml_load_string($xml);
            foreach ($sx->si as $si) {
                if (isset($si->t)) {
                    $shared[] = (string) $si->t;
                } else {
                    $t = '';
                    foreach ($si->r as $run) {
                        $t .= (string) $run->t;
                    }
                    $shared[] = $t;
                }
            }
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml === false) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (preg_match('#^xl/worksheets/sheet\d+\.xml$#', $name)) {
                    $sheetXml = $zip->getFromIndex($i);
                    break;
                }
            }
        }
        $zip->close();
        if ($sheetXml === false) {
            throw new RuntimeException('No worksheet found in the Excel file.');
        }

        $sheet = simplexml_load_string($sheetXml);
        $matrix = [];
        $autoRow = 0;
        foreach ($sheet->sheetData->row as $row) {
            $autoRow++;
            $rowNum = (int) ($row['r'] ?? $autoRow);
            $cells = [];
            $autoCol = -1;
            foreach ($row->c as $c) {
                $autoCol++;
                $col = isset($c['r']) ? $this->colIndex((string) $c['r']) : $autoCol;
                $type = (string) ($c['t'] ?? '');

                if ($type === 's') {
                    $val = $shared[(int) $c->v] ?? '';
                } elseif ($type === 'inlineStr') {
                    $val = (string) $c->is->t;
                } else {
                    $val = (string) $c->v;
                    // 1001.0 -> 1001 (Excel stores numbers as floats)
                    if (($type === '' || $type === 'n') && is_numeric($val) && abs((float) $val) < 1e15 && (float) $val == (int) $val) {
                        $val = (string) (int) $val;
                    }
                }
                $cells[$col] = $val;
            }
            if ($cells) {
                $matrix[$rowNum] = $cells;
            }
        }
        return $matrix;
    }

    private function colIndex(string $ref): int
    {
        preg_match('/^[A-Z]+/i', $ref, $m);
        $n = 0;
        foreach (str_split(strtoupper($m[0] ?? 'A')) as $ch) {
            $n = $n * 26 + (ord($ch) - 64);
        }
        return $n - 1;
    }
}
