# 🔄 From Test to Production: Upgrade Guide

When you have production keys and want to go live with real payments:

## Step 1: Get Production Keys ✓

### Clerk Production Keys
1. Go to https://dashboard.clerk.com
2. Click your app
3. Go to API Keys section
4. Copy the **Production** keys (not test!)
   - Secret Key
   - Publishable Key

### Cashfree Production Keys
1. Go to https://merchant.cashfree.com
2. Login with your business account
3. Go to Settings → API Keys
4. Get:
   - App ID (Production)
   - Secret Key (Production)

### Cloudinary
- Free tier works the same in "production"
- No changes needed

---

## Step 2: Update Environment Variables in Render

In Render Dashboard → Your Service → Environment:

**Changes to make:**
```
# BEFORE (Test Mode)
NODE_ENV=development
CASHFREE_MODE=sandbox
CLERK_SECRET_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CASHFREE_APP_ID=test_id_...
CASHFREE_SECRET_KEY=test_secret_...

# AFTER (Production Mode)
NODE_ENV=production
CASHFREE_MODE=production
CLERK_SECRET_KEY=pk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CASHFREE_APP_ID=production_id_...
CASHFREE_SECRET_KEY=production_secret_...
```

---

## Step 3: Update Frontend in Vercel (Optional)

If you're using different keys for test vs production:

In Vercel Dashboard → Your Project → Environment Variables:
```
# Keep pointing to same backend
VITE_API_URL=https://your-render-backend.onrender.com

# Can update Clerk key if using separate test/production projects
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

Usually you can keep the same, Clerk handles it.

---

## Step 4: Test Production Mode Locally

Before deploying, test locally with production keys:

1. Update your local `.env` with production keys
2. Set `NODE_ENV=production` and `CASHFREE_MODE=production`
3. Run locally: `npm run dev`
4. Test:
   ```bash
   # Login should still work
   # Payment: DON'T use 4111... card
   # Instead, use a REAL test card from Cashfree docs
   # (Usually provided in Cashfree merchant dashboard)
   ```

---

## Step 5: Deploy to Production

### Option A: Render Auto-Deploy
- If GitHub connected: Just commit code changes
- Render redeploys automatically with new env vars

### Option B: Manual Redeploy
1. Go to Render Dashboard
2. Click your service
3. Click "Redeploy"
4. Wait for deployment

---

## Step 6: Verify Production Deployment

```bash
# 1. Health check
curl https://your-beatflow-backend.onrender.com/api/health
# Should return {"status":"ok"}

# 2. Check logs for errors
# Render Dashboard → Logs tab
# Should see no "Cannot verify webhook" errors

# 3. Test payment with REAL test card from Cashfree
# (Ask Cashfree support for test card number if unsure)
# Payment should process and verify in real-time

# 4. Check database for user
# Premium status should be set correctly
```

---

## ⚠️ Critical: Payment Changes

### In Test Mode (NODE_ENV=development)
```
✓ All payments auto-verify
✓ Test card 4111... works
✓ Premium instantly granted
```

### In Production Mode (NODE_ENV=production)
```
✓ Real Cashfree validation happens
✓ Test card 4111... does NOT work
✓ Only valid real cards accepted
✓ Real money is processed
```

---

## 🛡️ Security Checklist Before Going Live

- [ ] `NODE_ENV=production` (not `development`)
- [ ] `CASHFREE_MODE=production` (not `sandbox`)
- [ ] Using `pk_live_*` Clerk keys (not `pk_test_*`)
- [ ] Using production Cashfree App ID & Secret
- [ ] `CLIENT_URL` points to your real domain (not localhost)
- [ ] HTTPS everywhere (Render/Vercel provide this)
- [ ] Check Render logs for no errors
- [ ] Test payment with real card (or Cashfree test card)

---

## 🆘 Troubleshooting Production

### "Payment immediately fails"
- Check `CASHFREE_MODE=production`
- Make sure you're using production Cashfree keys
- Check if using test card (4111...) - won't work in production

### "Webhook errors in logs"
- Go to Clerk → Webhooks → Edit endpoint
- Verify URL is your PRODUCTION Render URL (not test)
- Copy new signing secret → update `CLERK_WEBHOOK_SECRET`
- Render will redeploy, webhooks should work

### "Users can't login"
- Check `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` are production keys
- Verify they're set in both:
  - Render environment
  - Vercel environment (if separate)

### "Payment sometimes fails"
- Check Cashfree account status (not suspended)
- Check daily transaction limits
- Check rate limiting (disabled in production code)

---

## 📊 Monitoring in Production

### Daily Tasks
1. Check Render logs for errors
2. Check Cashfree merchant dashboard for transaction status
3. Check MongoDB for new users/payments

### Weekly Tasks
1. Review user feedback
2. Monitor performance (slow queries)
3. Check error rate

### Monthly Tasks
1. Review payment success rate
2. Update user counts
3. Plan new features

---

## 🚀 Launch Announcement

When you go live:
```
🎉 BeatFlow is now accepting real payments!
- Users can buy monthly/yearly subscriptions
- Premium features unlocked
- Real money handling enabled
```

---

## Questions?

If something breaks in production:
1. Check Render logs immediately
2. Check if test/production keys got mixed up
3. Verify `NODE_ENV` and `CASHFREE_MODE` values
4. Check Cashfree merchant dashboard for transaction details
5. Rollback: Revert env vars and redeploy

---

**Remember**: Production is real money. Test thoroughly before launch! ✓
