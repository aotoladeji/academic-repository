<?php

namespace App\Support;

class Africa
{
    /** ISO 3166-1 alpha-2 codes of the 54 African countries */
    public const CODES = [
        'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ',
        'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG',
        'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO',
        'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
    ];

    public static function isAfrican(?string $code): bool
    {
        return $code !== null && in_array(strtoupper($code), self::CODES, true);
    }

    /**
     * sole    = no co-authors
     * global  = at least one co-author outside Africa
     * africa  = every co-author is at an African institution
     * unknown = some co-authors have no country recorded
     */
    public static function collaborationScope(?array $coAuthors): string
    {
        $countries = collect($coAuthors ?? [])
            ->pluck('country')
            ->map(fn ($c) => $c ? strtoupper(trim((string) $c)) : null);

        if ($countries->isEmpty()) {
            return 'sole';
        }
        if ($countries->contains(fn ($c) => $c && !self::isAfrican($c))) {
            return 'global';
        }
        if ($countries->every(fn ($c) => $c && self::isAfrican($c))) {
            return 'africa';
        }
        return 'unknown';
    }
}