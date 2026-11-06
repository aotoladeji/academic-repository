<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ $mailSubject }}</title>
</head>
<body style="margin:0;padding:0;background:#EAF1FF;font-family:Arial,Helvetica,sans-serif;color:#1E1B4B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAF1FF;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td align="center" style="background:#8B5CF6;padding:20px;">
            @if (file_exists(public_path('logo.png')))
              <img src="{{ $message->embed(public_path('logo.png')) }}" alt="University crest" height="64"
                   style="height:64px;width:auto;display:block;margin:0 auto 8px;background:#ffffff;border-radius:6px;padding:4px;">
            @endif
            <div style="color:#ffffff;font-size:18px;font-weight:bold;">Publication Repository</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 12px;">Dear {{ $name }},</p>
            <div>{!! nl2br(e($body)) !!}</div>
            <p style="margin:24px 0 0;color:#6D28D9;">— Publication Repository Administration</p>
          </td>
        </tr>
        <tr>
          <td style="background:#EAF1FF;padding:12px;text-align:center;font-size:12px;color:#4b4b7a;">
            This message was sent from the Publication Repository.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>