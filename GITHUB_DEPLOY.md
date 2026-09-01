# Quick Deploy to GitHub Pages (5 Minutes)

Follow these exact steps to get your site live on GitHub.

## Step 1: Create GitHub Account (if you don't have one)
- Go to [github.com](https://github.com)
- Click **Sign up**
- Fill in username, email, password
- Verify email
- Done ✓

## Step 2: Create Repository

1. Click **+** icon (top-right) → **New repository**
2. Fill in:
   - **Repository name**: `dadcybertips`
   - **Description**: `Digital security assessment quiz`
   - **Public** ✓ (must be public for GitHub Pages)
3. Click **Create repository**

## Step 3: Upload Files

### Method A: Upload via Website (Easiest)

1. In your new repo, click **uploading an existing file** or drag & drop
2. Select `index.html` from your computer
3. Click **Commit changes**
4. Done! ✓

### Method B: Using Git Command Line (More Control)

Open Terminal/Command Prompt and run:

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/dadcybertips.git
cd dadcybertips

# Copy index.html, README.md, .gitignore into this folder

# Upload to GitHub
git add .
git commit -m "Initial commit: DadCyberTips website"
git push origin main
```

## Step 4: Enable GitHub Pages

1. Go to your repo → **Settings** (top-right)
2. Click **Pages** (left sidebar under "Code and automation")
3. Under "Build and deployment":
   - **Source**: Select **Deploy from a branch**
   - **Branch**: `main`
   - **Folder**: `/ (root)`
4. Click **Save**
5. Wait 1-2 minutes for deployment

## Step 5: Access Your Site

Your site is now live at:
```
https://YOUR_USERNAME.github.io/dadcybertips
```

Example: If your GitHub username is `gavinalex`, your site is at:
```
https://gavinalex.github.io/dadcybertips
```

---

## Optional: Use Custom Domain

If you own `dadcybertips.com`:

### In GitHub:
1. Go to repo **Settings** → **Pages**
2. Under "Custom domain", enter: `dadcybertips.com`
3. Click **Save**
4. GitHub generates a CNAME file automatically

### At Your Domain Registrar:
1. Go to DNS settings (GoDaddy, Namecheap, etc.)
2. Add/edit CNAME record:
   - **Name**: `www`
   - **Value**: `YOUR_USERNAME.github.io`
3. Save
4. Wait 24 hours for DNS to propagate
5. Your site will be at `https://www.dadcybertips.com` ✓

Alternatively, add an A record pointing to GitHub's IP:
- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

---

## Common Issues

**Q: Site shows 404**
- Wait 2-3 minutes after pushing
- Check Settings → Pages to confirm deployment status

**Q: CNAME not working**
- Make sure DNS is set to `YOUR_USERNAME.github.io`
- Wait 24-48 hours for DNS propagation
- Clear browser cache

**Q: Can't find Settings**
- Make sure you're on your repository page
- Settings is in the top-right navigation bar

---

## Updates & Maintenance

To update your site:

### Via Website:
1. Go to repo → find the file
2. Click pencil ✏️ to edit
3. Make changes
4. Click **Commit changes**
5. Wait ~1 minute for auto-deploy ✓

### Via Git:
```bash
cd dadcybertips
# Edit files locally
git add .
git commit -m "Update: [describe change]"
git push origin main
```

---

## Next Steps

1. **Add email integration** (optional)
   - See README.md for Formspree setup
   - Then edit the `sendResultEmail()` function

2. **Customize content**
   - Edit quiz questions in index.html
   - Change store links to your URLs
   - Adjust colors/branding

3. **Monitor submissions**
   - Set up Formspree to send results to your email
   - Or check analytics via GitHub

---

## Support

**GitHub Pages Docs**: https://docs.github.com/en/pages

**Stuck?** Check:
- Is repository **Public**?
- Is **Pages** enabled in Settings?
- Are you using the correct GitHub username URL?
- Did you wait 2+ minutes after push?

You're live! 🎉
