<?php

// Polyfill for mb_split(), which Laravel's Illuminate\Support\Str::studly()
// calls unconditionally. Wasmer Edge's PHP runtime does not ship the
// mbstring extension, and Symfony's polyfill-mbstring deliberately omits
// mb_split() (it was deprecated upstream), so without this shim every
// request crashes with "Call to undefined function ... mb_split()".
// Loaded via composer.json's autoload.files so it's available before any
// framework code runs.

if (! function_exists('mb_split')) {
    function mb_split(string $pattern, string $string, int $limit = -1): array|false
    {
        return preg_split('/'.str_replace('/', '\/', $pattern).'/u', $string, $limit);
    }
}
