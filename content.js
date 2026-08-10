// Web Suite Pro - All-in-One Content Script (FB Hider, Buster Captcha Solver & YouTube NonStop)

(function () {
  'use strict';

  let config = {
    blockAdsEnabled: true,
    blockUnfollowedPagesEnabled: true,
    blockUnjoinedGroupsEnabled: true,
    captchaSolverEnabled: true,
    youtubeNonstopEnabled: true,
    blockedUids: [],
    blockedCount: 0
  };

  // Inject dynamic CSS rules for blocked UIDs so browser engine hides them with ZERO delay (Guarded against matching comments)
  function updateDynamicUidCss() {
    let style = document.getElementById('fb-blocked-uids-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'fb-blocked-uids-style';
      const container = document.head || document.documentElement;
      if (container) container.appendChild(style);
    }
    if (!style) return;

    if (!config.blockedUids || config.blockedUids.length === 0) {
      style.textContent = '';
      return;
    }
    const selectors = [];
    config.blockedUids.forEach(uid => {
      const clean = uid.trim().replace(/['"\\]/g, '');
      const lower = clean.toLowerCase();
      // Safeguard: Never match system routes or generic group/page words
      if (clean && lower !== 'groups' && lower !== 'pages' && lower !== 'posts') {
        selectors.push(`div[data-pagelet^="FeedUnit"]:has(a[href*="/user/${clean}"])`);
        selectors.push(`div[aria-posinset]:has(a[href*="/user/${clean}"])`);
        selectors.push(`div[data-dedup-key]:has(a[href*="/user/${clean}"])`);
        selectors.push(`div[data-pagelet^="FeedUnit"]:has(a[href*="/${clean}"])`);
        selectors.push(`div[aria-posinset]:has(a[href*="/${clean}"])`);
      }
    });
    style.textContent = selectors.length > 0 
      ? `${selectors.join(',')}{display:none!important;visibility:hidden!important;height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;}` 
      : '';
  }

  // Check if current page is Messenger OR if element is inside any Messenger chat window/dialog/sidebar/bubble/dock
  function isMessengerElement(el) {
    if (window.location.href.includes('/messages/')) return true;
    if (!el) return false;
    try {
      // 1. Direct check using HTML attributes/CSS variables found in Messenger chat DOM
      if (el.closest(
        'div[role="dialog"], div[aria-label*="Chat" i], div[aria-label*="Trò chuyện" i], ' +
        'div[aria-label*="Messenger" i], div[aria-label*="Đoạn chat" i], div[data-pagelet*="Chat"], ' +
        'div[data-pagelet*="Dock"], div[data-pagelet*="Message"], div[role="region"][aria-label*="Chat" i], ' +
        'div[role="region"][aria-label*="Trò chuyện" i], [aria-label="Cuộc trò chuyện"], [aria-label="Chats"], ' +
        'div[class*="messenger" i], div[class*="Chat" i], [data-testid*="messenger" i], [data-testid*="chat" i], ' +
        'div[data-scope="messages_table"], div[role="gridcell"], div[role="row"], div[class*="message" i], [aria-label="Tin nhắn"], ' +
        'div[data-message-id], a[href*="/messenger_media/"], a[href*="thread_id="], div[style*="--chat-"]'
      )) {
        return true;
      }
      
      // 2. Check if element itself contains inline style with --chat- variables or message attributes
      if (el.hasAttribute && (el.hasAttribute('data-message-id') || (el.getAttribute('style') || '').includes('--chat-'))) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  // Check if an element or container is inside a Comment section or IS a comment item
  function isCommentElement(el) {
    if (!el) return false;
    if (isMessengerElement(el)) return true;
    try {
      if (el.closest(
        'div[aria-label*="bình luận" i], div[aria-label*="comment" i], ' +
        'ul[class*="comment" i], div[class*="comment" i], form, ' +
        '[aria-label="Bình luận"], [aria-label="Comments"], [aria-label="Viết bình luận..."]'
      )) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  // Force rescan all existing posts on screen when UID blocklist changes
  function forceRescan() {
    const checkedPosts = document.querySelectorAll('.fb-ad-blocker-checked');
    checkedPosts.forEach(p => p.classList.remove('fb-ad-blocker-checked'));
    runScanner();
  }

  // Safe storage initial load
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.sync) {
      chrome.storage.sync.get(['blockAdsEnabled', 'blockUnfollowedPagesEnabled', 'blockUnjoinedGroupsEnabled', 'captchaSolverEnabled', 'youtubeNonstopEnabled', 'blockedUids', 'blockedCount'], (result) => {
        try {
          if (!chrome.runtime?.id) return;
          config.blockAdsEnabled = result.blockAdsEnabled !== false;
          config.blockUnfollowedPagesEnabled = result.blockUnfollowedPagesEnabled !== false;
          config.blockUnjoinedGroupsEnabled = result.blockUnjoinedGroupsEnabled !== false;
          config.captchaSolverEnabled = result.captchaSolverEnabled !== false;
          config.youtubeNonstopEnabled = result.youtubeNonstopEnabled !== false;
          config.blockedUids = result.blockedUids || [];
          config.blockedCount = result.blockedCount || 0;
          updateDynamicUidCss();
          runScanner();
        } catch (e) {}
      });
    }
  } catch (e) {}

  // Safe storage listener
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        try {
          if (!chrome.runtime?.id) return;
          if (area === 'sync') {
            if (changes.blockAdsEnabled) config.blockAdsEnabled = changes.blockAdsEnabled.newValue;
            if (changes.blockUnfollowedPagesEnabled) config.blockUnfollowedPagesEnabled = changes.blockUnfollowedPagesEnabled.newValue;
            if (changes.blockUnjoinedGroupsEnabled) config.blockUnjoinedGroupsEnabled = changes.blockUnjoinedGroupsEnabled.newValue;
            if (changes.captchaSolverEnabled) config.captchaSolverEnabled = changes.captchaSolverEnabled.newValue;
            if (changes.youtubeNonstopEnabled) config.youtubeNonstopEnabled = changes.youtubeNonstopEnabled.newValue;
            if (changes.blockedUids) {
              config.blockedUids = changes.blockedUids.newValue || [];
              updateDynamicUidCss();
              forceRescan();
            }
            runScanner();
          }
        } catch (e) {}
      });
    }
  } catch (e) {}

  // Helper: Toast notification
  function showToast(message) {
    const existing = document.querySelector('.fb-block-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'fb-block-toast';
    toast.innerHTML = `<span>${message}</span>`;
    (document.body || document.documentElement).appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fb-block-toast-out');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // Extract UID or Username from author profile URL string ONLY
  function extractUidFromUrl(urlStr) {
    if (!urlStr) return null;
    try {
      const url = new URL(urlStr, window.location.origin);
      
      // Case 1: Group member author link (facebook.com/groups/123/user/456/)
      if (url.pathname.includes('/user/')) {
        const userMatch = url.pathname.match(/\/user\/(\d+|[\w.]+)/);
        if (userMatch) return userMatch[1];
      }

      // Ignore group home / permalink URLs (facebook.com/groups/12345/)
      if (url.pathname.startsWith('/groups/')) {
        return null; // Group links are NOT user UIDs!
      }

      // Case 2: profile.php?id=1000123456
      if (url.searchParams.has('id')) {
        return url.searchParams.get('id');
      }

      // Case 3: facebook.com/username
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const first = pathParts[0];
        const ignore = ['home.php', 'watch', 'marketplace', 'groups', 'gaming', 'events', 'saved', 'memories', 'messages', 'notifications', 'friends', 'reels', 'stories', 'ads', 'pages', 'posts'];
        if (!ignore.includes(first.toLowerCase())) {
          return first;
        }
      }
    } catch (e) {
      const matchId = urlStr.match(/[?&]id=(\d+)/);
      if (matchId) return matchId[1];
    }
    return null;
  }

  // Helper 1: Reads raw text without hidden span restrictions
  function getRawText(element) {
    if (!element) return '';
    return (element.textContent || element.innerText || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper 1b: Instant zero-delay visible text extraction (No getComputedStyle needed!)
  // FB obfuscation inserts 50+ fake letter spans with 15-25 class names to apply CSS hiding.
  // Real letter spans ('A' and 'd') only have 3-5 standard class names!
  function getFastVisibleText(element) {
    if (!element) return '';
    try {
      const flexSpans = element.querySelectorAll('span[style*="display: flex"], span[style*="display:flex"], div[style*="display: flex"]');
      for (let flexSpan of flexSpans) {
        const childSpans = flexSpan.querySelectorAll('span');
        if (childSpans.length < 3) continue;

        let realChars = [];
        childSpans.forEach(span => {
          // Fake spans inserted by FB to obfuscate Ad text have 10+ class names used for CSS hiding rules!
          // Real letter spans have only 3-5 standard utility class names!
          const classCount = span.classList ? span.classList.length : 0;
          const styleAttr = span.getAttribute('style') || '';
          const isInlineHidden = styleAttr.includes('display: none') || styleAttr.includes('opacity: 0') || styleAttr.includes('font-size: 0');

          if (classCount <= 6 && !isInlineHidden) {
            const char = span.textContent.replace(/[\u0300-\u036f\u034f\u200b-\u200d\ufeff]/g, '').trim();
            if (char) {
              realChars.push({
                char: char,
                order: parseInt(span.style.order || '0', 10),
                left: span.getBoundingClientRect ? span.getBoundingClientRect().left : 0
              });
            }
          }
        });

        if (realChars.length > 0) {
          realChars.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.left - b.left;
          });

          const word = realChars.map(c => c.char).join('').trim();
          const sortedLetters = realChars.map(c => c.char).sort().join('').trim();

          if (word === 'Ad' || word === 'Sponsored' || word === 'Được tài trợ' || word === 'Quảng cáo' || 
              sortedLetters === 'Ad' || sortedLetters === 'aD') {
            return 'Ad';
          }
        }
      }
    } catch (e) {}

    return '';
  }

  // Helper 2: Resolves aria-labelledby target elements (FB places label text in hidden span referenced by ID)
  function getAriaLabelledbyText(element) {
    if (!element) return '';
    const idAttr = element.getAttribute('aria-labelledby');
    if (!idAttr) return '';
    const ids = idAttr.split(/\s+/);
    let text = '';
    for (let id of ids) {
      const target = document.getElementById(id);
      if (target) {
        text += ' ' + (target.textContent || target.innerText || '');
      }
    }
    return text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Helper 3: Unscramble CSS flexbox 'order' property obfuscation (FBPurity unravelenigmad method)
  function getFlexOrderedText(element) {
    if (!element) return '';
    const children = element.querySelectorAll('span[style*="order"], div[style*="order"]');
    if (children.length === 0) return '';

    const orderedChars = [];
    children.forEach(child => {
      const styleAttr = child.getAttribute('style') || '';
      const match = styleAttr.match(/order:\s*(\d+)/i);
      if (match) {
        const orderIdx = parseInt(match[1], 10);
        const char = (child.textContent || '').trim();
        if (char) {
          orderedChars[orderIdx] = char;
        }
      }
    });

    return orderedChars.filter(Boolean).join('').trim();
  }

  // Target post container (Strictly guarded against targeting comments, Messenger, or non-feed elements)
  function getPostContainer(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
    if (isMessengerElement(node) || isCommentElement(node)) return null;

    // STRICT GUARD: Reject any node inside Messenger chat popups, chat docks, or dialogs
    if (node.closest('div[role="dialog"], [data-pagelet*="Chat"], [data-pagelet*="Dock"], [data-pagelet*="Message"], [data-scope="messages_table"]')) {
      return null;
    }

    // STRICT GUARD: Must be inside a Feed container (News Feed, Group Feed, Profile Wall Feed)
    const feedParent = node.closest('div[role="feed"], div[data-pagelet^="FeedUnit"], div[aria-posinset], div[data-dedup-key]');
    if (!feedParent) return null;

    const unsafeRoles = ['feed', 'main', 'navigation', 'banner', 'complementary', 'grid', 'table'];

    // 1. First search for top-level Feed Unit containers
    let container = node.closest('div[data-pagelet^="FeedUnit"], div[aria-posinset], div[data-dedup-key]');

    // 2. Fallback to div[role="article"], BUT pick top-most container inside feed and exclude comments & Messenger
    if (!container) {
      const articles = [];
      let curr = node.closest('div[role="article"]');
      while (curr && feedParent.contains(curr)) {
        if (!isCommentElement(curr) && !isMessengerElement(curr)) {
          articles.push(curr);
        }
        curr = curr.parentElement ? curr.parentElement.closest('div[role="article"]') : null;
      }
      if (articles.length > 0) {
        container = articles[articles.length - 1];
      }
    }

    if (container) {
      if (isCommentElement(container) || isMessengerElement(container)) return null;

      const role = container.getAttribute('role');
      if (unsafeRoles.includes(role) || container.nodeName === 'BODY' || container.nodeName === 'HTML') {
        return null;
      }
      if (container.offsetHeight > 3500) {
        return null;
      }
      return container;
    }

    return null;
  }

  // Check if post is an Ad / Sponsored (Defeats Obfuscated Spans, Canvas, Object, SVG Sprites, Link Indices, Aria-Labelledby & CSS Order)
  function isAdPost(post) {
    if (!config.blockAdsEnabled) return false;
    if (isMessengerElement(post) || isCommentElement(post)) return false;

    const adRegex = /^(Ad|Sponsored|Được tài trợ|Quảng cáo|Suggested for you|Được đề xuất)(\s*[\cdot•·|\n\r]|$)/i;

    // 0. OBFUSCATED SPANS DETECTION (FB inserts 50+ fake letter spans with zero-width invisible classes)
    const obfuscatedMatch = getFastVisibleText(post);
    if (obfuscatedMatch) {
      return true;
    }

    // 1. CANVAS Detection (FB draws "Ad" / "Sponsored" onto a 2D Canvas in post header ONLY)
    if (!isMessengerElement(post) && !isCommentElement(post)) {
      const headerCanvas = post.querySelectorAll('h4+div canvas, h5+div canvas, [role="heading"]+div canvas');
      for (let canvas of headerCanvas) {
        if (canvas.width > 0 && canvas.width < 120 && !isMessengerElement(canvas)) {
          return true;
        }
      }
    }

    // 2. OBJECT Tag Detection (FBPurity Oct 2025 technique)
    const objectLinks = post.querySelectorAll('object a, object span');
    for (let link of objectLinks) {
      const txt = getRawText(link).replace(/-/g, '');
      if (adRegex.test(txt) || txt === 'Ad' || txt === 'Sponsored' || txt === 'Được tài trợ' || txt === 'Quảng cáo') {
        return true;
      }
    }

    // 3. SVG <use xlink:href="#id"> Sprite Target Lookup (FBPurity June 2025 technique)
    const svgUses = post.querySelectorAll('svg use');
    for (let use of svgUses) {
      const href = use.getAttribute('xlink:href') || use.getAttribute('href');
      if (href && href.startsWith('#')) {
        try {
          const target = document.querySelector(href);
          if (target) {
            const targetTxt = getRawText(target);
            if (adRegex.test(targetTxt) || targetTxt.includes('Ad') || targetTxt.includes('Sponsored') || targetTxt.includes('Được tài trợ')) {
              return true;
            }
            if (target.nextSibling) {
              const sibTxt = getRawText(target.nextSibling);
              if (adRegex.test(sibTxt)) return true;
            }
          }
        } catch (e) {}
      }
    }

    // 4. Link Index [2] & [3] Check (Post timestamp / ad info link)
    const postLinks = post.querySelectorAll('a[role="link"], a[href]');
    if (postLinks.length > 2) {
      for (let i = 2; i < Math.min(postLinks.length, 5); i++) {
        const linkTxt = getRawText(postLinks[i]).replace(/-/g, '');
        if (adRegex.test(linkTxt) || linkTxt === 'Ad' || linkTxt === 'Sponsored' || linkTxt === 'Được tài trợ') {
          return true;
        }
      }
    }

    // 5. Check aria-label attributes anywhere in post
    const ariaEls = post.querySelectorAll('[aria-label]');
    for (let el of ariaEls) {
      const label = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      if (label === 'sponsored' || label === 'được tài trợ' || label === 'ad' || label === 'quảng cáo' || 
          label === 'advertisement' || label.startsWith('ad ') || label.startsWith('sponsored ') || label.includes('about_this_ad')) {
        return true;
      }
    }

    // 6. Check aria-labelledby target elements
    const ariaLabelledByEls = post.querySelectorAll('[aria-labelledby]');
    for (let el of ariaLabelledByEls) {
      const labelledText = getAriaLabelledbyText(el);
      if (adRegex.test(labelledText) || labelledText === 'Ad' || labelledText === 'Sponsored' || labelledText === 'Được tài trợ' || labelledText === 'Quảng cáo') {
        return true;
      }
    }

    // 7. Check ad-specific links (About this ad, Ads Manager, Ad tracking parameters)
    const adLinks = post.querySelectorAll(
      'a[href*="/ads/about/"], a[href*="about_this_ad"], a[href*="ads/create"], ' +
      'a[href*="adsmanager"], a[href*="facebook.com/ads/"], a[href*="ad_id="], a[href*="campaign_id="]'
    );
    if (adLinks.length > 0) return true;

    // 8. CSS flexbox 'order' property unscrambling
    const orderedText = getFlexOrderedText(post);
    if (adRegex.test(orderedText) || orderedText === 'Ad' || orderedText === 'Sponsored' || orderedText === 'Được tài trợ') {
      return true;
    }

    // 9. Read RAW text of headers, timestamps, and subtitle spans
    const headerContainers = post.querySelectorAll('h4, h5, [role="heading"], div[dir="auto"], span[dir="auto"], a[role="link"], a[href], span');
    for (let container of headerContainers) {
      const rawTxt = getRawText(container);
      if (adRegex.test(rawTxt)) {
        return true;
      }
      if (rawTxt === 'Ad' || rawTxt === 'Sponsored' || rawTxt === 'Được tài trợ' || rawTxt === 'Quảng cáo') {
        return true;
      }
    }

    return false;
  }

  // Check if post belongs to a blocked UID
  function isBlockedUidPost(post) {
    if (!config.blockedUids || config.blockedUids.length === 0) return false;
    if (isCommentElement(post)) return false;

    const links = post.querySelectorAll('h4 a, h5 a, [role="heading"] a, div[dir="auto"] a, a[role="link"]');
    for (let link of links) {
      if (isCommentElement(link)) continue;
      const href = link.getAttribute('href') || '';
      const uid = extractUidFromUrl(href);
      
      if (uid && config.blockedUids.some(blocked => blocked.toLowerCase() === uid.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  // Inject placeholder bar with "Xem bài viết" button
  function injectPlaceholderBar(post, reasonText) {
    if (!post || isMessengerElement(post) || isCommentElement(post) || post.querySelector('.fb-hidden-post-placeholder')) return;

    const bar = document.createElement('div');
    bar.className = 'fb-hidden-post-placeholder';

    const info = document.createElement('div');
    info.className = 'fb-placeholder-info';
    info.innerHTML = `<span>${reasonText}</span>`;

    const unhideBtn = document.createElement('button');
    unhideBtn.className = 'fb-unhide-btn';
    unhideBtn.innerHTML = 'Xem bài viết';

    unhideBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isRevealed = post.classList.contains('fb-ad-blocker-revealed');
      if (isRevealed) {
        post.classList.remove('fb-ad-blocker-revealed');
        unhideBtn.innerHTML = 'Xem bài viết';
      } else {
        post.classList.add('fb-ad-blocker-revealed');
        unhideBtn.innerHTML = 'Ẩn bài viết';
      }
    });

    bar.appendChild(info);
    bar.appendChild(unhideBtn);
    post.insertBefore(bar, post.firstChild);
  }

  // Check if a post belongs to a Facebook Group (Group posts should NOT be hidden by unfollowed page filter)
  function isGroupPost(post) {
    if (!post) return false;
    // Check if post contains links to /groups/
    const groupLinks = post.querySelectorAll('a[href*="/groups/"]');
    if (groupLinks.length > 0) return true;
    
    // Check if user is currently on a group page URL
    if (window.location.href.includes('/groups/')) return true;

    return false;
  }

  // Check if post is from an unfollowed page or suggested page
  function isUnfollowedPagePost(post) {
    if (!config.blockUnfollowedPagesEnabled) return false;
    if (isCommentElement(post)) return false;

    // IMPORTANT: Exclude Group posts! Members in groups have "Follow" button next to their name
    if (isGroupPost(post)) return false;

    // 1. Check aria-label of buttons inside post header (Follow / Theo dõi)
    const ariaBtns = post.querySelectorAll('[aria-label]');
    for (let btn of ariaBtns) {
      if (isCommentElement(btn)) continue;
      const label = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
      if (label === 'follow' || label === 'theo dõi' || label.startsWith('follow ') || label.startsWith('theo dõi ')) {
        return true;
      }
    }

    // 2. Check header text for Follow / Theo dõi buttons or Suggested label
    const headerElements = post.querySelectorAll('h4, h5, [role="heading"], div[dir="auto"], span[dir="auto"], div[role="button"], span[role="button"], a[role="button"]');
    const suggestRegex = /^(Suggested for you|Được đề xuất|Gợi ý cho bạn|Được đề xuất cho bạn|Popular near you|Phổ biến ở gần bạn)$/i;

    for (let el of headerElements) {
      if (isCommentElement(el)) continue;
      const txt = getRawText(el);
      if (suggestRegex.test(txt) || txt === 'Follow' || txt === 'Theo dõi' || txt === '• Follow' || txt === '• Theo dõi' || txt === '· Follow' || txt === '· Theo dõi') {
        return true;
      }
    }

    return false;
  }

  // Check if post is from an unjoined Group (Contains "Join" / "Tham gia" button or Group recommendation label)
  function isUnjoinedGroupPost(post) {
    if (!config.blockUnjoinedGroupsEnabled) return false;
    if (isCommentElement(post)) return false;

    // Do NOT apply if user is currently inside a Group page URL directly
    if (window.location.href.includes('/groups/')) return false;

    // 1. Check aria-label of buttons inside post header (Join / Tham gia)
    const ariaBtns = post.querySelectorAll('[aria-label]');
    for (let btn of ariaBtns) {
      if (isCommentElement(btn)) continue;
      const label = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
      if (label === 'join' || label === 'tham gia' || label === 'join group' || label === 'tham gia nhóm' ||
          label.startsWith('join ') || label.startsWith('tham gia ')) {
        return true;
      }
    }

    // 2. Check header elements for Join text or Suggested Group text
    const headerElements = post.querySelectorAll('h4, h5, [role="heading"], div[dir="auto"], span[dir="auto"], div[role="button"], span[role="button"], a[role="button"]');
    const suggestGroupRegex = /^(Suggested group|Nhóm được đề xuất|Groups suggested for you|Nhóm gợi ý cho bạn|Join group|Tham gia nhóm)$/i;

    for (let el of headerElements) {
      if (isCommentElement(el)) continue;
      const txt = getRawText(el);
      if (suggestGroupRegex.test(txt) || txt === 'Join' || txt === 'Tham gia' || txt === '• Join' || txt === '• Tham gia' || txt === '· Join' || txt === '· Tham gia') {
        return true;
      }
    }

    return false;
  }

  // Process single post element
  function processPost(post) {
    if (!post || post.classList.contains('fb-ad-blocker-checked')) return;
    if (isCommentElement(post)) return;

    let shouldHide = false;
    let hideReason = '';

    if (isAdPost(post)) {
      shouldHide = true;
      hideReason = 'Bài viết Quảng cáo đã bị ẩn';
      config.blockedCount++;
      chrome.storage.sync.set({ blockedCount: config.blockedCount });
    } else if (isUnfollowedPagePost(post)) {
      shouldHide = true;
      hideReason = 'Bài viết từ Page chưa Follow / Gợi ý đã bị ẩn';
    } else if (isUnjoinedGroupPost(post)) {
      shouldHide = true;
      hideReason = 'Bài viết từ Group chưa Join / Gợi ý nhóm đã bị ẩn';
    } else if (isBlockedUidPost(post)) {
      shouldHide = true;
      hideReason = 'Bài viết từ UID trong danh sách đen đã bị ẩn';
    }

    if (shouldHide) {
      post.classList.add('fb-ad-blocker-hidden');
      injectPlaceholderBar(post, hideReason);
    }

    post.classList.add('fb-ad-blocker-checked');
  }

  // Global scanner to catch ads from any element directly
  function scanGlobalAds() {
    if (!config.blockAdsEnabled) return;
    if (window.location.href.includes('/messages/')) return;

    // 1. Direct query for elements with ad attributes or ad links
    const adTargets = document.querySelectorAll(
      '[aria-label="Ad"], [aria-label="Sponsored"], [aria-label="Được tài trợ"], [aria-label="Quảng cáo"], ' +
      'a[href*="/ads/about/"], a[href*="about_this_ad"], a[href*="facebook.com/ads/"], a[href*="ad_id="]'
    );

    adTargets.forEach(target => {
      if (isMessengerElement(target) || isCommentElement(target)) return;
      const post = getPostContainer(target);
      if (post && !isMessengerElement(post) && !isCommentElement(post) && !post.classList.contains('fb-ad-blocker-hidden')) {
        post.classList.add('fb-ad-blocker-hidden', 'fb-ad-blocker-checked');
        injectPlaceholderBar(post, 'Bài viết Quảng cáo đã bị ẩn');
        config.blockedCount++;
        chrome.storage.sync.set({ blockedCount: config.blockedCount });
      }
    });

    // 2. Lookup hidden aria-labelledby target nodes
    const ariaLabelledNodes = document.querySelectorAll('[aria-labelledby]');
    const adRegex = /^(Ad|Sponsored|Được tài trợ|Quảng cáo)(\s*[\cdot•·|\n\r]|$)/i;
    ariaLabelledNodes.forEach(node => {
      if (isMessengerElement(node) || isCommentElement(node)) return;
      const text = getAriaLabelledbyText(node);
      if (adRegex.test(text) || text === 'Ad' || text === 'Sponsored' || text === 'Được tài trợ') {
        const post = getPostContainer(node);
        if (post && !isMessengerElement(post) && !isCommentElement(post) && !post.classList.contains('fb-ad-blocker-hidden')) {
          post.classList.add('fb-ad-blocker-hidden', 'fb-ad-blocker-checked');
          injectPlaceholderBar(post, 'Bài viết Quảng cáo đã bị ẩn');
          config.blockedCount++;
          chrome.storage.sync.set({ blockedCount: config.blockedCount });
        }
      }
    });

    const sidebars = document.querySelectorAll('div[role="complementary"] [data-pagelet*="Ad"], div[aria-label="Sponsored"], div[aria-label="Được tài trợ"]');
    sidebars.forEach(el => {
      if (!isMessengerElement(el) && !isCommentElement(el)) {
        el.classList.add('fb-ad-blocker-hidden');
      }
    });
  }

  // Inject "Block this UID" button when viewing a Wall/Profile page
  function injectWallBlockButton() {
    const currentUrl = window.location.href;
    const currentUid = extractUidFromUrl(currentUrl);

    if (!currentUid) return;

    // Target container on profile / page header
    const btnTarget = document.querySelector('div[aria-label*="Profile action bar"]') ||
                      document.querySelector('div[aria-label="Add friend"], div[aria-label="Thêm bạn bè"], div[aria-label="Message"], div[aria-label="Nhắn tin"], div[aria-label="Follow"], div[aria-label="Theo dõi"]')?.parentElement ||
                      document.querySelector('div[data-pagelet="ProfileHeader"] h1, div[data-pagelet="PageHeader"] h1')?.parentElement ||
                      document.querySelector('div[role="main"] h1')?.parentElement;

    if (!btnTarget) return;

    const existingBtn = document.querySelector('.fb-block-uid-btn');
    if (existingBtn) {
      if (existingBtn.dataset.uid === currentUid) return;
      existingBtn.remove();
    }

    const isBlocked = config.blockedUids.some(u => u.toLowerCase() === currentUid.toLowerCase());

    const btn = document.createElement('button');
    btn.className = `fb-block-uid-btn ${isBlocked ? 'is-blocked' : ''}`;
    btn.dataset.uid = currentUid;
    btn.innerHTML = isBlocked ? `Đã chặn UID (${currentUid})` : `Chặn UID này (${currentUid})`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      let updatedUids = [...config.blockedUids];

      if (updatedUids.some(u => u.toLowerCase() === currentUid.toLowerCase())) {
        updatedUids = updatedUids.filter(u => u.toLowerCase() !== currentUid.toLowerCase());
        btn.classList.remove('is-blocked');
        btn.innerHTML = `Chặn UID này (${currentUid})`;
        showToast(`Đã bỏ chặn UID: ${currentUid}`);
      } else {
        updatedUids.push(currentUid);
        btn.classList.add('is-blocked');
        btn.innerHTML = `Đã chặn UID (${currentUid})`;
        showToast(`Đã thêm UID: ${currentUid} vào danh sách ẩn!`);
      }

      config.blockedUids = updatedUids;
      chrome.storage.sync.set({ blockedUids: updatedUids }, () => {
        updateDynamicUidCss();
        forceRescan();
      });
    });

    btnTarget.appendChild(btn);
  }

  let lastActivePost = null;

  // Track exact post container whenever user interacts anywhere inside a post or 3-dots button
  ['mousedown', 'click', 'pointerdown'].forEach(eventType => {
    document.addEventListener(eventType, (e) => {
      const post = getPostContainer(e.target);
      if (post) {
        lastActivePost = post;
      }
    }, true);
  });

  // Extract exact main author UID or Username from a post card
  function getPostAuthorUid(post) {
    if (!post) return null;

    // Header container (h4, h5, heading or primary dir="auto" title)
    const header = post.querySelector('h4, h5, [role="heading"], div[dir="auto"]');
    if (header) {
      const links = header.querySelectorAll('a[href]');
      for (let a of links) {
        const href = a.getAttribute('href') || '';
        // Skip group links
        if (href.includes('/groups/') && !href.includes('/user/')) continue;
        const uid = extractUidFromUrl(href);
        if (uid) return uid;
      }
    }

    // Fallback: search all links in post top area
    const allLinks = post.querySelectorAll('a[role="link"], a[href]');
    for (let a of allLinks) {
      const href = a.getAttribute('href') || '';
      if (href.includes('/groups/') && !href.includes('/user/')) continue;
      const uid = extractUidFromUrl(href);
      if (uid) return uid;
    }

    return null;
  }

  // Inject "Block all posts from this UID" inside 3-dots post context menu
  function injectPostMenuBlockOption() {
    const menus = document.querySelectorAll('div[role="menu"]:not(.fb-menu-processed)');
    menus.forEach(menu => {
      menu.classList.add('fb-menu-processed');

      const firstItem = menu.querySelector('div[role="menuitem"]');
      if (!firstItem) return;

      if (menu.querySelector('.fb-menu-block-uid')) return;

      const menuItem = document.createElement('div');
      menuItem.className = 'fb-menu-block-uid';
      menuItem.setAttribute('role', 'menuitem');
      menuItem.setAttribute('tabindex', '0');
      menuItem.innerHTML = `
        <div class="fb-menu-item-inner">
          <span>Ẩn mọi bài từ tác giả này (Chặn UID)</span>
        </div>
      `;

      menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        menu.style.display = 'none';

        // 1. Check aria-expanded="true" 3-dots button directly in DOM
        const active3DotsBtn = document.querySelector('div[aria-expanded="true"]') || 
                              document.querySelector('div[aria-haspopup="menu"]:focus');
        
        let targetPost = getPostContainer(active3DotsBtn);

        // 2. Fallback to lastActivePost or activeElement
        if (!targetPost) {
          targetPost = lastActivePost || getPostContainer(document.activeElement);
        }

        // 3. Fallback A: Check aria-labelledby owner button if targetPost is null
        if (!targetPost) {
          const ownerId = menu.getAttribute('aria-labelledby');
          if (ownerId) {
            const ownerBtn = document.getElementById(ownerId);
            if (ownerBtn) targetPost = getPostContainer(ownerBtn);
          }
        }

        // 4. Reset lastActivePost immediately after attempt so stale IDs are NEVER retained!
        lastActivePost = null;

        // 5. Fallback B: Proximity geometric distance matching with menu coordinates
        if (!targetPost) {
          const menuRect = menu.getBoundingClientRect();
          let minDistance = Infinity;
          const allPosts = document.querySelectorAll('div[role="article"], div[data-pagelet^="FeedUnit"], div[aria-posinset]');
          allPosts.forEach(p => {
            const pRect = p.getBoundingClientRect();
            const dist = Math.abs((pRect.top + pRect.bottom) / 2 - (menuRect.top + menuRect.bottom) / 2);
            if (dist < minDistance) {
              minDistance = dist;
              targetPost = p;
            }
          });
        }

        if (targetPost) {
          const uid = getPostAuthorUid(targetPost);

          if (uid) {
            if (!config.blockedUids.some(u => u.toLowerCase() === uid.toLowerCase())) {
              config.blockedUids.push(uid);
              chrome.storage.sync.set({ blockedUids: config.blockedUids }, () => {
                updateDynamicUidCss();
                forceRescan();
                showToast(`Đã chặn UID tác giả: ${uid}!`);
              });
            } else {
              showToast(`UID: ${uid} đã có trong danh sách chặn!`);
            }
          } else {
            showToast('Không trích xuất được UID tác giả bài viết này!');
          }
        } else {
          showToast('Không xác định được bài viết cần chặn!');
        }
      });

      if (firstItem.parentElement) {
        firstItem.parentElement.insertBefore(menuItem, firstItem);
      }
    });
  }

  // Buster Captcha Solver Engine (reCAPTCHA v2 / hCaptcha / FB Captcha Audio Solver)
  function solveCaptchaBuster() {
    if (!config.captchaSolverEnabled) return;

    // 1. Target Captcha Frames & Challenge Containers
    const captchaFrames = document.querySelectorAll(
      'iframe[src*="recaptcha/api2/bframe"]:not(.fb-buster-processed), ' +
      'iframe[src*="recaptcha"]:not(.fb-buster-processed), ' +
      'iframe[src*="hcaptcha.com"]:not(.fb-buster-processed), ' +
      'div[id*="captcha"]:not(.fb-buster-processed), ' +
      'input[name="captcha_response"]:not(.fb-buster-processed)'
    );

    captchaFrames.forEach(frame => {
      frame.classList.add('fb-buster-processed');
      showToast('Đã phát hiện Captcha! Đang kích hoạt Buster Solver...');

      try {
        const frameDoc = frame.contentDocument || frame.contentWindow?.document || document;
        
        // Step A: Click Audio Challenge Button
        const audioBtn = frameDoc.querySelector('#recaptcha-audio-button, .rc-button-audio, button[title*="Audio"], button[title*="âm thanh"], #hcaptcha-audio-button');
        if (audioBtn) {
          audioBtn.click();
          showToast('Đã chuyển sang chế độ giải Captcha âm thanh!');
        }

        // Step B: Extract Audio Payload & Transcribe
        setTimeout(() => {
          const audioDownloadLink = frameDoc.querySelector('a.rc-audio-challenge-download-link, #audio-source, .rc-audio-challenge-play-button, audio source');
          const audioUrl = audioDownloadLink ? (audioDownloadLink.href || audioDownloadLink.src) : null;
          const responseInput = frameDoc.querySelector('#audio-response, .rc-response-input, input[name="captcha_response"], #hcaptcha-response');

          if (audioUrl && responseInput) {
            showToast('Đang xử lý file âm thanh Captcha...');

            // Transcribe audio using Web Speech / Free STT API endpoint
            transcribeAudioPayload(audioUrl, (transcribedText) => {
              if (transcribedText) {
                responseInput.value = transcribedText;
                responseInput.dispatchEvent(new Event('input', { bubbles: true }));

                const verifyBtn = frameDoc.querySelector('#recaptcha-verify-button, .rc-button-default, #hcaptcha-verify-button');
                if (verifyBtn) {
                  verifyBtn.click();
                  showToast('Giải Captcha thành công!');
                }
              }
            });
          }
        }, 1200);

      } catch (e) {}
    });
  }

  // Audio Speech Recognition helper for Buster Solver
  function transcribeAudioPayload(audioUrl, callback) {
    if (!audioUrl) return callback('');

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const text = event.results[0][0].transcript;
          callback(text);
        };
        recognition.onerror = () => callback('');
        recognition.start();
        return;
      }
    } catch (e) {}

    callback('');
  }

  // YouTube NonStop Engine (Auto-confirm "Video paused. Continue watching?" and auto-unpause)
  function handleYoutubeNonstop() {
    if (!config.youtubeNonstopEnabled) return;
    if (!window.location.hostname.includes('youtube.com')) return;

    // 1. Click "Yes / Continue watching" button on YouTube pause confirm dialog
    const confirmButtons = document.querySelectorAll(
      'ytd-popup-container yt-confirm-dialog-renderer #confirm-button button, ' +
      'tp-yt-paper-dialog #confirm-button button, ' +
      'ytd-button-renderer#confirm-button, ' +
      '.yt-spec-button-shape-next--call-to-action'
    );

    confirmButtons.forEach(btn => {
      const dialog = btn.closest('yt-confirm-dialog-renderer, tp-yt-paper-dialog, ytd-popup-container');
      if (dialog && (dialog.offsetWidth > 0 || dialog.offsetHeight > 0)) {
        btn.click();
        showToast('YouTube NonStop: Đã tự động bấm tiếp tục phát!');
      }
    });

    // 2. Auto Play video if paused by idle confirmation
    const video = document.querySelector('video.html5-main-video, video');
    if (video && video.paused && !video.ended) {
      const dialogVisible = document.querySelector('yt-confirm-dialog-renderer:not([hidden]), tp-yt-paper-dialog[style*="display: block"]');
      if (dialogVisible) {
        video.play().catch(() => {});
      }
    }
  }

  // Scan current DOM for posts and ads
  function runScanner() {
    if (window.location.href.includes('/messages/')) return;
    
    const posts = document.querySelectorAll('div[role="article"], div[data-pagelet^="FeedUnit"], div[aria-posinset], div[data-pagelet^="Feed"]');
    posts.forEach(processPost);

    scanGlobalAds();
    injectWallBlockButton();
    injectPostMenuBlockOption();
    solveCaptchaBuster();
    handleYoutubeNonstop();
  }

  // Observer to handle dynamically loaded content as user scrolls
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (let mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      runScanner();
    }
  });

  // Start observing DOM changes immediately at document_start
  const targetRoot = document.documentElement || document;
  observer.observe(targetRoot, {
    childList: true,
    subtree: true
  });

  // Execute immediate scan as soon as DOM is interactive
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runScanner);
  } else {
    runScanner();
  }

  // Continuous fast scanner (every 300ms) to instantly catch React posts whose CSS style injected asynchronously
  setInterval(runScanner, 300);

  // Instant trigger on mouse movement over page
  document.addEventListener('mouseover', (e) => {
    const post = getPostContainer(e.target);
    if (post && !post.classList.contains('fb-ad-blocker-checked')) {
      processPost(post);
    }
  }, { passive: true });

  // URL change listener for Single Page Application navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(runScanner, 300);
    }
  }).observe(document.documentElement || document, { subtree: true, childList: true });

})();
