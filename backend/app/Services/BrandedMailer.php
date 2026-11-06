<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;

/** Sends every system email with the crest, header and footer. */
class BrandedMailer
{
    public static function send(string $to, string $subject, string $name, string $body): void
    {
        Mail::send(
            ['html' => 'emails.branded', 'text' => 'emails.branded-text'],
            ['name' => $name, 'body' => $body, 'mailSubject' => $subject],
            fn ($m) => $m->to($to)->subject($subject)
        );
    }
}