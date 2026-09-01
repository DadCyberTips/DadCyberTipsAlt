# Dad Cyber Tips - Digital Security Assessment

A dark-themed, interactive security quiz website for families learning about cybersecurity. Built with vanilla HTML, CSS, and JavaScript.

## Features

✨ **Interactive Quiz**
- 12 weighted cybersecurity questions
- One question at a time (progressive stepping)
- Real-time progress tracking
- Personalized security scores (1-10 scale)
- Email collection for results

🎨 **Design**
- Dark mode (dark background with neon green accents)
- Fully responsive (mobile-friendly)
- Fast-loading (zero dependencies)
- Professional, trustworthy aesthetic

🔐 **Smart Scoring**
- Weighted questions based on security importance
- 5 security levels with tailored recommendations
- Instant feedback with actionable next steps

🛍️ **Store Integration**
- Direct links to Payhip store (books & guides)
- Fourthwall merch shop integration
- Seamless checkout experience

## File Structure

```
├── index.html          # Main website (ready to deploy)
├── README.md          # This file
└── .gitignore         # Git configuration
```

## Deployment Options

### Option 1: GitHub Pages (Recommended - Free)

**Step 1: Create a new repository**
1. Go to [github.com](https://github.com) and sign in
2. Click **+ New repository** in the top-left
3. Name it `dadcybertips` (or any name you prefer)
4. Description: "Digital security assessment quiz"
5. Choose **Public** (required for GitHub Pages)
6. Click **Create repository**

**Step 2: Upload files**
1. Click **uploading an existing file** link (or drag & drop)
2. Upload `index.html`
3. Write commit message: "Initial commit: DadCyberTips website"
4. Click **Commit changes**

**Step 3: Enable GitHub Pages**
1. Go to **Settings** → **Pages** (left sidebar)
2. Under "Source", select **Deploy from a branch**
3. Select branch: **main**
4. Select folder: **/ (root)**
5. Click **Save**
6. Wait 1-2 minutes for build to complete
7. Your site will be live at: `https://yourusername.github.io/dadcybertips`

**Optional: Custom domain**
If you own a domain (e.g., `dadcybertips.com`):
1. Go to **Settings** → **Pages**
2. Under "Custom domain", enter your domain
3. Add CNAME record to your domain registrar pointing to `yourusername.github.io`
4. GitHub will verify in 24 hours

---

### Option 2: Netlify (Alternative - Free)

1. Go to [netlify.com](https://netlify.com) and sign up
2. Click **Add new site** → **Deploy manually**
3. Drag & drop `index.html`
4. Your site goes live instantly at a URL like `random-name.netlify.app`
5. Optional: Connect custom domain in site settings

---

### Option 3: Local Hosting (Testing)

Simply open `index.html` in your browser to test locally before deploying.

---

## Configuration

### Email Integration (Optional)

The quiz currently logs results to browser console. To receive email submissions:

**Using Formspree (Free, No Backend Required)**

1. Go to [formspree.io](https://formspree.io)
2. Sign up with your email
3. Create a new form
4. Copy your Form ID
5. In `index.html`, find the `sendResultEmail()` function (~line 500)
6. Uncomment this section and replace `YOUR_FORM_ID`:

```javascript
fetch('https://formspree.io/f/YOUR_FORM_ID', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        email: email,
        score: score,
        level: levelName,
        timestamp: new Date().toISOString()
    })
}).catch(err => console.log('Email sent:', email));
```

7. Save and redeploy

**Alternative Email Services:**
- SendGrid: Full-featured email service
- Mailchimp: Great for email marketing + automation
- Firebase Cloud Functions: More control, serverless backend
- Custom backend: Node.js, PHP, Python, etc.

---

## Customization

### Change Store Links

In `index.html`, find the store section (line ~330):

```html
<a href="https://payhip.com/dadcybertips" target="_blank">
```

Replace URLs with your own store links.

### Modify Quiz Questions

In the `<script>` section (line ~550), edit the `quizData` array:

```javascript
{
    question: "Your question here?",
    options: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correct: 0,  // Index of correct answer (0 = first option)
    weight: 3,   // Importance: 1 (low), 2 (medium), 3 (heavy)
    weightLabel: "Heavy",
    weightClass: "weight-heavy",
    tip: "Helpful tip for this question"
}
```

### Adjust Color Scheme

Key colors in CSS:
- `#31ff57` - Neon green (accents)
- `#0f0f0d` - Dark background
- `#1a1a18` - Card background
- `#e8e8e6` - Light text

Search and replace to change the theme.

---

## Browser Support

✅ Chrome, Firefox, Safari, Edge (modern versions)
✅ Mobile browsers (iOS Safari, Chrome Mobile)
✅ No plugins or dependencies required

---

## Performance

- **Size**: ~50KB (single HTML file, no external dependencies)
- **Load Time**: <1 second on most connections
- **SEO**: Optimized for search engines

---

## License

Created by Gavin Marlowe / Dad Cyber Tips  
Feel free to use, modify, and share

---

## Support

For issues or questions:
1. Check that `index.html` is in the root folder
2. Verify your GitHub Pages settings (Settings → Pages)
3. Clear browser cache (Ctrl+Shift+Del) and reload

---

## Changelog

**v1.0** (2024)
- Initial release
- Dark mode theme
- Progressive quiz stepping
- Personalized security scores
- Store integration
- GitHub Pages ready
