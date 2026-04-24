

## Plan: Apply Alares Logo to Sidebar & Favicon + Security Check

### What will be done

1. **Copy the logo** from `user-uploads://logo_alares_png.png` to both `public/alares-logo.png` (for favicon) and `src/assets/alares-logo.png` (for sidebar import).

2. **Update Sidebar (`src/pages/Index.tsx`):**
   - Replace the Wi-Fi icon in the brand section with an `<img>` tag importing the logo from `@/assets/alares-logo.png`.
   - Size it to `h-8 w-8` with `rounded-lg` to match the current slot.
   - Make the logo + "Alares Lab" text clickable, navigating to the "dashboard" tab.

3. **Update Favicon (`index.html`):**
   - Remove existing favicon reference.
   - Delete `public/favicon.ico` if present.
   - Add `<link rel="icon" href="/alares-logo.png" type="image/png">`.

4. **Security Check:** Run a security scan to confirm no new vulnerabilities.

### Files affected
- `src/pages/Index.tsx` — sidebar brand area
- `index.html` — favicon link
- `public/alares-logo.png` — new file (copy)
- `src/assets/alares-logo.png` — new file (copy)

