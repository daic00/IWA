# Deployment Guide

## Deployment Options

### Option 1: GitHub Pages (Free)

1. Create a GitHub repository
2. Push all files to the repository
3. Go to repository Settings > Pages
4. Select branch: `main`, folder: `/ (root)`
5. Your site will be available at: `https://yourusername.github.io/repository-name`

### Option 2: Netlify (Free)

1. Sign up at [Netlify](https://www.netlify.com/)
2. Click "Add new site" > "Deploy manually"
3. Drag and drop your entire project folder
4. Your site will be deployed with a random subdomain
5. Optional: Configure custom domain

### Option 3: Vercel (Free)

1. Sign up at [Vercel](https://vercel.com/)
2. Import your GitHub repository or upload files
3. Vercel will automatically deploy your site
4. Get a free `.vercel.app` subdomain

### Option 4: Traditional Web Hosting

Upload all files via FTP/SFTP to your web hosting:

**Required Files:**
```
/
├── index.html
├── call-for-papers.html
├── program.html
├── committees.html
├── venue.html
├── registration.html
├── contact.html
├── css/
├── js/
└── images/
```

## Pre-Deployment Checklist

- [ ] Add IWA logo to `images/iwa-logo.png`
- [ ] Add hero background image (optional) to `images/water-bg.jpg`
- [ ] Update contact email addresses throughout the site
- [ ] Verify all internal links work correctly
- [ ] Test on mobile devices
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Check all external links open in new tabs
- [ ] Review content for typos and accuracy
- [ ] Optimize images for web (compress file sizes)
- [ ] Add Google Analytics code (optional)
- [ ] Set up SSL certificate (HTTPS)

## Custom Domain Setup

### For GitHub Pages:

1. Add a `CNAME` file with your domain:
   ```
   conference.yourdomain.com
   ```
2. Configure DNS with your domain registrar:
   - Type: CNAME
   - Name: conference (or @)
   - Value: yourusername.github.io

### For Netlify/Vercel:

1. Go to domain settings in dashboard
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL will be automatically provisioned

## Performance Optimization

### Image Optimization

```bash
# Install ImageMagick (macOS)
brew install imagemagick

# Optimize JPG images
for i in images/*.jpg; do
  convert "$i" -strip -quality 85 "$i"
done

# Optimize PNG images
for i in images/*.png; do
  convert "$i" -strip "$i"
done
```

### Enable Gzip Compression

Add to `.htaccess` (Apache) or configure in Netlify/Vercel settings:

```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript
</IfModule>
```

### Browser Caching

Add to `.htaccess`:

```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

## Analytics Integration

### Google Analytics (GA4)

Add before closing `</head>` tag in all HTML files:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## Security Headers

Add to `.htaccess` or configure in hosting platform:

```apache
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

## SSL Certificate

- **GitHub Pages**: Automatic with custom domain
- **Netlify/Vercel**: Automatic (Let's Encrypt)
- **Traditional Hosting**: Usually available in cPanel or contact host

## Monitoring

### Uptime Monitoring

Free services:
- UptimeRobot (https://uptimerobot.com/)
- Pingdom (free tier)
- StatusCake (free tier)

### Error Tracking

- Google Search Console for SEO errors
- Browser DevTools for JavaScript errors
- Server logs for 404 errors

## Backup Strategy

1. Keep local copy of all files
2. Version control with Git
3. Regular backups of image assets
4. Export hosting platform backups monthly

## Update Workflow

1. Make changes locally
2. Test thoroughly on localhost or staging
3. Commit to Git
4. Push to production
5. Verify deployment
6. Clear CDN cache if applicable

## Support

For deployment issues:
- GitHub Pages: https://docs.github.com/pages
- Netlify: https://docs.netlify.com/
- Vercel: https://vercel.com/docs

## Emergency Contacts

**Web Administrator:**  
Email: suws2025@tongji.edu.cn  
Phone: +86 021-65986919

---

**Note:** This is a static website with no backend dependencies, making deployment straightforward on any web server or static hosting platform.

