# Deploy nethush.com

## Apache on your own server

The production document root is **dist/**. No database, Composer packages, PHP extension or Node server is required.

1. Clone `https://github.com/jsdyer/nethush-com.git` to a directory outside other sites' document roots.
2. Point the nethush.com virtual host at the checkout's `dist/` directory.
3. Use a valid TLS certificate and redirect plain HTTP to HTTPS through your normal server configuration.
4. Permit the included `.htaccess` directives (`AllowOverride FileInfo Options Indexes`), or copy them into the virtual host's `<Directory>` block and use `AllowOverride None`.
5. Enable `mod_headers`, configure the server/CDN logs with a retention policy you can honestly describe, and keep analytics/optimisation injectors off for this site.
6. Point the domain's DNS at that server when you are ready to launch. This repository does not change DNS or certificates.

Example path-only excerpt (merge with your existing HTTPS virtual host):

```apache
ServerName nethush.com
ServerAlias www.nethush.com
DocumentRoot /var/www/nethush-com/dist
<Directory /var/www/nethush-com/dist>
    Require all granted
    AllowOverride FileInfo Options Indexes
</Directory>
```

TLS certificate paths, redirects and log retention depend on your server; configure them explicitly. Add HSTS only after HTTPS is working and you understand the effect on subdomains.

## Other static hosts

Deploy the contents of `dist/`. A `_headers` file is supplied for hosts that support it. On other hosts, set equivalent response headers in their configuration. The document CSP remains active even without header support; framing protection requires HTTP headers.

GitHub Pages can serve this project, but it needs a Pages build/deployment configuration and custom-domain setup. This repo intentionally contains no `CNAME` file and does not change any existing GitHub Pages domain. The private preview described by `.openai/hosting.json` is separate from nethush.com's DNS.

## Verify after deployment

- Visit the HTTPS origin and confirm no mixed-content warnings.
- In browser Network tools, initial loads should request only same-origin HTML, CSS, JavaScript and favicon. Running tools should add no API calls.
- Inspect response headers for CSP, Referrer-Policy, X-Content-Type-Options, Permissions-Policy and frame protection.
- Test a link containing `utm_source`, generate and clear a disposable password, and scrub a non-sensitive sample photo.
- Confirm checklist state is not saved until opted in; confirm reset removes it.
- Check navigation and tool forms on a narrow screen and with a keyboard.
- Review the host/CDN privacy and logging settings rather than inferring them from the application.
