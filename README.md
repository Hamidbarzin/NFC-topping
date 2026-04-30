# Smart NFC Digital Card System — Topping Courier

Bilingual product overview (English / فارسی). The original interactive document lives at [`attached_assets/topping_nfc_bilingual_fa_en_1776228597880.html`](attached_assets/topping_nfc_bilingual_fa_en_1776228597880.html). For stack and dev commands, see [`replit.md`](replit.md).

---

## Overview

**EN:** A physical NFC card that brings customers into the Topping digital ecosystem while also becoming their personal digital identity card.

**FA:** یک کارت فیزیکی NFC که مشتری را وارد اکوسیستم دیجیتال Topping می‌کند و همزمان کارت معرفی شخصی او می‌شود.

**Highlights:** NFC + QR · Web app integration · Digital profile · $40 credit (where applicable)

---

## Project goals

| EN | FA |
|----|-----|
| New customer acquisition — NFC as face-to-face marketing | جذب مشتری جدید — کارت NFC ابزار بازاریابی حضوری |
| Web app registration — every activator becomes a Topping user | ثبت‌نام در Web App — هر مشتری که کارت می‌گیرد در سیستم ثبت‌نام می‌کند |
| Personal digital card — professional profile on every tap | کارت دیجیتال شخصی — پروفایل حرفه‌ای با هر Tap |
| Brand strength — Topping visible on every card | افزایش اعتبار برند — حضور دائم Topping روی کارت دیجیتال |
| Data capture — customer data for follow-up sales | جمع‌آوری اطلاعات — داده در دیتابیس برای فروش بعدی |
| Upsell — delivery, subscriptions, digital tools | فروش خدمات بیشتر — دلیوری، اشتراک، ابزار دیجیتال |

---

## Problem & solution

**Today’s problem (EN):** Paper cards get lost; contact info goes stale; no tracking; no follow-up; brand fades after handoff.

**مشکل امروز (FA):** کارت کاغذی گم می‌شود؛ اطلاعات قدیمی؛ بدون ردیابی؛ فروش بعدی نیست؛ برند فراموش می‌شود.

**Our solution (EN):** Durable NFC card; always-updated digital profile; full data capture; entry into Topping; brand always present.

**راه‌حل ما (FA):** کارت NFC ماندگار؛ پروفایل همیشه آپدیت؛ ثبت داده؛ ورود به اکوسیستم؛ برند همیشه حاضر.

---

## How it works (4 steps)

1. **Blank NFC card** — NTAG213 / NTAG215; unique URL encoded per card.  
   **کارت خام NFC** — خرید کارت خام؛ نوشتن لینک یکتا روی هر کارت.

2. **Tap or scan** — Customer taps or scans QR; server checks activation.  
   **Tap یا Scan** — لمس یا اسکن؛ سرور وضعیت فعال‌سازی را بررسی می‌کند.

3. **First-time registration** — If not activated, activation page; customer enters details (once).  
   **ثبت‌نام اولیه** — اگر فعال نشده، صفحه فعال‌سازی و ورود اطلاعات.

4. **Digital card** — Every later tap opens the personal digital profile.  
   **کارت دیجیتال** — از این به بعد هر Tap پروفایل شخصی را باز می‌کند.

---

## Card states

| State | EN | FA |
|-------|----|-----|
| New | Not activated; waiting for first tap | کارت فعال نشده؛ منتظر اولین Tap |
| Activated | Customer registered; card linked | مشتری ثبت‌نام کرده؛ کارت به حساب وصل شده |
| Active | In use; profile shown | در حال استفاده؛ پروفایل نمایش داده می‌شود |
| Suspended | Disabled by admin if needed | توسط ادمین غیرفعال |

---

## User experience

**First time — activation:** Topping branding, welcome, $40 credit messaging, registration (name / email / phone), password, business name & short description, create digital profile.

**Later taps — digital card:** Name & business, photo/logo, phone & WhatsApp, email, web & socials, address, save contact, share QR, “Powered by Topping Courier”.

**FA (خلاصه):** بار اول ثبت‌نام؛ دفعات بعد فقط Tap و نمایش پروفایل.

---

## Two-sided value

**For the customer:** Professional digital card · instant sharing · easy edits · easy sharing · lasting identity.

**For Topping:** Structured data · web app registration · future sales · strong in-person branding · ecosystem growth.

---

## Web app integration

**EN:** The card is the entry point; the web app is the core system. Activation means full registration in Topping — delivery orders, credit dashboard, profile edits, logistics, subscriptions, digital tools.

**FA:** کارت فقط ورودی است؛ Web App سیستم اصلی است. با فعال‌سازی، مشتری به‌طور کامل در Topping ثبت می‌شود.

Flow: **NFC card → customer registration → web app (core) → registered ecosystem user.**

---

## System architecture

**Flow:** NFC card (unique URL only) → server + domain (`card.toppingcourier.ca`) → backend logic (activated or not?) → web app (Topping dashboard).

### Suggested database shape

- **Cards:** id, card_code, user_id, status, credit_amount, created_at  
- **Users:** id, full_name, business_name, phone, email, password  
- **Profiles:** user_id, website, instagram, linkedin, address, bio/logo  
- **Credits:** id, user_id, amount, used_amount, expires_at  

---

## Operational model

| Layer | Does |
|-------|------|
| **Card** | Opens unique link only; no customer data on card; reprogrammable; iOS & Android |
| **Server** | Checks activation; registration vs profile; SSL & security |
| **Database** | Cards/codes, users, profiles, credit & state |

---

## Physical packaging

**EN:** Deliver the card in a professional sleeve; higher perceived value; promotional copy (e.g. Tap to Activate, $40 Credit Inside); sleeve sells, card delivers.

**FA:** کاور حرفه‌ای؛ ارزش بصری؛ پیام تبلیغاتی؛ ابزار فروش حضوری.

---

## Pricing (indicative)

| Tier | Price | Notes |
|------|-------|--------|
| Basic | $25 | NFC + QR, simple profile, registration, shareable link |
| Pro | $39 | Full profile + logo, online editing, social links |
| Premium | $49–79 | Pro + $40 credit, personal dashboard, full web app tie-in |

**Launch idea:** Free activation for first 50 customers, or free-card acquisition model.

---

## Implementation phases

1. **Card procurement** — Blank NFC (prefer rewriteable); unique codes.  
2. **Server & domain** — Subdomain, SSL, routes per card.  
3. **Backend** — Cards, registration, card–user binding, credit.  
4. **Frontend** — Activate, profile, edit, Topping branding.  
5. **Field testing** — Early customers; conversion & UX.

---

## Competitive edge (summary)

Compared to basic competitors: full digital profile, system registration, service integration, built-in credit ($40), persistent “Powered by” branding, customer dashboard.

---

## Sales script (short)

**Base pitch (EN):** Smart card — tap or scan to build your digital card, register in our system, use it to introduce your business.

**Credit pitch (EN):** Includes **$40 credit** for Topping services — one tap.

**Tips:** Present in a sleeve · emphasize $40 · demo tap live · “card stays with you” · show Powered by Topping.

---

## Closing

**EN:** One card. One system. One ecosystem. — `card.toppingcourier.ca`

**FA:** یک کارت. یک سیستم. یک اکوسیستم.

---

*Topping Courier · Smart NFC Digital Card MVP*
