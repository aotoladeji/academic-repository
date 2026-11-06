<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],

    // Exact origins (set FRONTEND_URL in .env for your real website address)
    'allowed_origins' => array_filter([env('FRONTEND_URL')]),

    // Any localhost / 127.0.0.1 port (5173, 5174, 3000 …) – handy while developing
    'allowed_origins_patterns' => ['#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#'],

    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];