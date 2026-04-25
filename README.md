<img align="left" width="100" height="100" style="border-radius: 15%" src="branding/logo/picsur.svg"/>

# Picsur

> Totally not an Imgur clone

Built by a person who couldn't really find any open source project that allowed you to easily host images. So I decided to create one.

It feels like a hybrid between Imgur and Pastebin.

## Features

Here is a list of done features, and what is planned.
For a more detailed list, you can always visit [the project](https://github.com/CaramelFur/Picsur/projects/1).

Every featured marked here should work in the latest release.

- [x] Uploading and viewing images
- [x] Anonymous uploads
- [x] User accounts
- [x] User roles and permissions
- [x] Proper CORS restrictions
- [x] Exif stripping
- [x] Ability to keep original
- [x] Support for many formats
  - QOI
  - JPG
  - PNG
  - WEBP (animated supported)
  - TIFF
  - HEIF
  - BMP
  - GIF (animated supported)
  - JPG-XL
  - JPG-2000
- [x] Convert images
- [x] Edit images
  - Resize
  - Rotate
  - Flip
  - Strip transparency
  - Negative
  - Greyscale
- [x] Deletable images
- [x] Proper DB migrations
- [x] Show own images in list
- [x] Correct previews on chats
- [x] Expiring images
- [x] ShareX endpoint
- [x] ARM64 and AMD64 Docker image

- [ ] White mode
- [ ] Public gallery
- [ ] Albums

## Bugs

If you encounter any bugs or oddities, please open an issue [here](https://github.com/bmcgonag/Picsur/issues). Cause without feedback I'll never know they exists.

## Star

If you like this project, don't forget to give it a star. It tells me that I'm not wasting my time on something that people don't like.

## FAQ

### Is this project maintained?

Yes. It has received updates via AI and manual Human checking.

Updates made:

- [x] CVE checks and updates
- [x] Best Practice Review and Updates
- [x] Unit Tests Added
- [x] API Tests Added
- [x] Front End Tests Added
- [x] Manual Testing for Functionality

### How do I allow users to register their own accounts?

By default, users can't register their own accounts. This is to prevent users from accidentally allowing anyone to upload to their instance.

If you want to allow this you can though. To change this you go to `settings -> roles -> guest -> edit`, and then give the guest role the `Register` permission. Upon saving the role, the register button will appear on the login page.

### I want to keep my original image files, how?

By default, Picsur will not keep your original image files. Since for most purposes this is not needed, and it saves disk space.

If you want to enable this however, you can do so by going to `settings -> general`, and then enabling the `Keep original` option. Upon saving the settings, the original files will be kept.

Do keep in mind here, that the exif data will NOT be removed from the original image. So make sure you do not accidentally share sensitive data.

### This service says its supports the QOI format, what is this?

QOI is a new lossless image format that is designed to be very fast to encode and decode. All while still offering good compression ratios. This is the primary format the server will store images in when uploaded.

You can [read more about QOI here](https://qoiformat.org/).

### What is the default admin login?

There is no default admin user. The first user you register will automatically become an admin. After registration, new user registration is automatically disabled for security reasons.

To re-enable registration, go to `settings -> roles -> guest -> edit`, and give the guest role the `Register` permission.

### I get "Copying to clipboard failed"

It is only possible to use the clipboard functionality on HTTPS websites or localhost. Please ensure you are running Picsur with HTTPS.

### How do I configure OIDC authentication?

Picsur supports OIDC/OAuth2 login via providers like Authentik, Keycloak, or Google. To enable it, set these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `PICSUR_OIDC_ENABLED` | Enable OIDC auth | `true` |
| `PICSUR_OIDC_ISSUER` | OIDC provider issuer URL | `https://auth.example.com/application/o/picsur/` |
| `PICSUR_OIDC_CLIENT_ID` | Client ID from your OIDC provider | |
| `PICSUR_OIDC_CLIENT_SECRET` | Client secret from your OIDC provider | |
| `PICSUR_OIDC_PROVIDER_NAME` | Display name for login button | `Authentik` |
| `PICSUR_OIDC_AUTO_LINK_BY_EMAIL` | Auto-link existing users by email | `true` |
| `PICSUR_DISABLE_BUILTIN_AUTH` | Disable username/password login | `false` |
| `PICSUR_ORIGIN` | Your Picsur URL (required for OIDC) | `https://picsur.example.com` |

After enabling, the OIDC login button will appear on the login page. When clicked, a popup window will open for authentication with your OIDC provider.

## Running your own instance

You easily run this service yourself via Docker. The file in the project under the `support` directory called picsurdocker-compose.ymal is there for production use.
