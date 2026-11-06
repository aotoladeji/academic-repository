<?php

use Illuminate\Support\Facades\Route;

// The frontend build (frontend/vite.config.js) outputs straight into
// public/, so this serves the SPA shell for every non-API route.
Route::get('/{any?}', function () {
    $index = public_path('index.html');

    abort_unless(file_exists($index), 404);

    return response()->file($index, ['Content-Type' => 'text/html']);
})->where('any', '^(?!api).*$');
