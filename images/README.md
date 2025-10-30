# Images Directory

Place your conference images in this folder.

## Required Images

### 1. IWA Logo (`iwa-logo.png`)
- **Purpose:** Conference and IWA branding in navigation
- **Recommended size:** 200x80px
- **Format:** PNG with transparent background
- **Usage:** Navigation bar logo
- **Download from:** [IWA Network](https://iwa-network.org/)

### 2. Hero Background (`water-bg.jpg`) - Optional
- **Purpose:** Background image for hero section
- **Recommended size:** 1920x1080px
- **Format:** JPG or WebP
- **Usage:** Hero section background (currently using CSS gradient)
- **Note:** Image is displayed with 10% opacity overlay

## Optional Images

### Speaker Photos
- Create a `speakers/` subdirectory for keynote speaker photos
- **Format:** JPG or PNG
- **Recommended size:** 400x400px (square aspect ratio)

### Venue Photos
- Create a `venue/` subdirectory for venue and Shanghai photos
- **Format:** JPG
- **Recommended size:** 1200x800px

### Sponsor Logos
- Create a `sponsors/` subdirectory for sponsor logos
- **Format:** PNG with transparent background
- **Recommended size:** 300x150px

## Image Optimization Tips

1. **Compress images** before uploading
   - Use tools like TinyPNG, ImageOptim, or Squoosh
   - Target file size: < 200KB for photos, < 50KB for logos

2. **Use appropriate formats**
   - Logos: PNG (with transparency)
   - Photos: JPG or WebP
   - Icons: SVG (preferred) or PNG

3. **Responsive images**
   - Provide @2x versions for high-DPI displays if needed
   - Consider using `<picture>` element for art direction

## Directory Structure Example

```
images/
├── iwa-logo.png              # Conference logo (required)
├── water-bg.jpg              # Hero background (optional)
├── speakers/                 # Speaker photos
│   ├── speaker-1.jpg
│   ├── speaker-2.jpg
│   └── ...
├── venue/                    # Venue photos
│   ├── conference-hall.jpg
│   ├── shanghai-skyline.jpg
│   └── ...
└── sponsors/                 # Sponsor logos
    ├── sponsor-1.png
    ├── sponsor-2.png
    └── ...
```

## Copyright Notice

Ensure you have proper rights and permissions for all images used on the website.
- Conference photos: Own or licensed
- Logos: Authorized use from respective organizations
- Stock photos: Licensed from stock photo services

