document.addEventListener('DOMContentLoaded', () => {
  const toggleAds = document.getElementById('toggleAds');
  const blockedCountEl = document.getElementById('blockedCount');
  const uidInput = document.getElementById('uidInput');
  const addUidBtn = document.getElementById('addUidBtn');
  const uidList = document.getElementById('uidList');
  const uidCountBadge = document.getElementById('uidCountBadge');
  const emptyState = document.getElementById('emptyState');

  const toggleUnfollowed = document.getElementById('toggleUnfollowed');
  const toggleUnjoinedGroups = document.getElementById('toggleUnjoinedGroups');
  const toggleCaptcha = document.getElementById('toggleCaptcha');
  const toggleYoutube = document.getElementById('toggleYoutube');

  let state = {
    blockAdsEnabled: true,
    blockUnfollowedPagesEnabled: true,
    blockUnjoinedGroupsEnabled: true,
    captchaSolverEnabled: true,
    youtubeNonstopEnabled: true,
    blockedCount: 0,
    blockedUids: []
  };

  // Helper: Extract UID or Username from string input or URL (Smart Group link parser)
  function cleanUidInput(val) {
    if (!val) return '';
    val = val.trim();
    try {
      if (val.startsWith('http://') || val.startsWith('https://')) {
        const url = new URL(val);
        // Case 1: profile.php?id=1000123456
        if (url.searchParams.has('id')) {
          return url.searchParams.get('id');
        }
        // Case 2: Group member post link (facebook.com/groups/123/user/456/)
        if (url.pathname.includes('/user/')) {
          const userMatch = url.pathname.match(/\/user\/(\d+|[\w.]+)/);
          if (userMatch) return userMatch[1];
        }
        // Case 3: Standard user profile URL facebook.com/username
        const pathParts = url.pathname.split('/').filter(Boolean);
        const systemRoutes = ['groups', 'pages', 'watch', 'marketplace', 'events', 'stories', 'reels', 'gaming', 'posts'];
        
        // Find first non-system path part
        for (let part of pathParts) {
          if (!systemRoutes.includes(part.toLowerCase()) && !/^\d+$/.test(part) && part.length > 2) {
            return part;
          }
        }
      }
    } catch (e) {}

    // Fallback cleanup
    let clean = val.replace(/^(https?:\/\/)?(www\.)?facebook\.com\//, '').replace(/\/$/, '');
    clean = clean.replace(/^groups\/\d+\/user\//, '').replace(/^groups\/\d+\//, '');
    return clean;
  }

  // Render UID List
  function renderUidList() {
    uidList.innerHTML = '';
    const uids = state.blockedUids;

    uidCountBadge.textContent = `${uids.length} UID`;

    if (uids.length === 0) {
      uidList.appendChild(emptyState);
      return;
    }

    uids.forEach((uid, index) => {
      const item = document.createElement('div');
      item.className = 'uid-item';

      const text = document.createElement('span');
      text.className = 'uid-text';
      text.textContent = uid;
      text.title = uid;

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete';
      delBtn.innerHTML = '✕';
      delBtn.title = 'Xóa UID này';

      delBtn.addEventListener('click', () => {
        removeUid(index);
      });

      item.appendChild(text);
      item.appendChild(delBtn);
      uidList.appendChild(item);
    });
  }

  // Load state from Storage
  function loadState() {
    chrome.storage.sync.get(['blockAdsEnabled', 'blockUnfollowedPagesEnabled', 'blockUnjoinedGroupsEnabled', 'captchaSolverEnabled', 'youtubeNonstopEnabled', 'blockedCount', 'blockedUids'], (result) => {
      state.blockAdsEnabled = result.blockAdsEnabled !== false;
      state.blockUnfollowedPagesEnabled = result.blockUnfollowedPagesEnabled !== false;
      state.blockUnjoinedGroupsEnabled = result.blockUnjoinedGroupsEnabled !== false;
      state.captchaSolverEnabled = result.captchaSolverEnabled !== false;
      state.youtubeNonstopEnabled = result.youtubeNonstopEnabled !== false;
      state.blockedCount = result.blockedCount || 0;
      state.blockedUids = result.blockedUids || [];

      toggleAds.checked = state.blockAdsEnabled;
      if (toggleUnfollowed) toggleUnfollowed.checked = state.blockUnfollowedPagesEnabled;
      if (toggleUnjoinedGroups) toggleUnjoinedGroups.checked = state.blockUnjoinedGroupsEnabled;
      if (toggleCaptcha) toggleCaptcha.checked = state.captchaSolverEnabled;
      if (toggleYoutube) toggleYoutube.checked = state.youtubeNonstopEnabled;
      blockedCountEl.textContent = state.blockedCount.toLocaleString();
      renderUidList();
    });
  }

  // Save UIDs to storage
  function saveUids() {
    chrome.storage.sync.set({ blockedUids: state.blockedUids }, () => {
      renderUidList();
    });
  }

  // Add new UID
  function addUid() {
    const rawVal = uidInput.value;
    const uid = cleanUidInput(rawVal);

    if (!uid) return;

    if (!state.blockedUids.some(u => u.toLowerCase() === uid.toLowerCase())) {
      state.blockedUids.push(uid);
      saveUids();
      uidInput.value = '';
    } else {
      alert('UID/Username này đã có trong danh sách!');
    }
  }

  // Remove UID by index
  function removeUid(index) {
    state.blockedUids.splice(index, 1);
    saveUids();
  }

  // Event Listeners
  toggleAds.addEventListener('change', (e) => {
    state.blockAdsEnabled = e.target.checked;
    chrome.storage.sync.set({ blockAdsEnabled: state.blockAdsEnabled });
  });

  if (toggleUnfollowed) {
    toggleUnfollowed.addEventListener('change', (e) => {
      state.blockUnfollowedPagesEnabled = e.target.checked;
      chrome.storage.sync.set({ blockUnfollowedPagesEnabled: state.blockUnfollowedPagesEnabled });
    });
  }

  if (toggleUnjoinedGroups) {
    toggleUnjoinedGroups.addEventListener('change', (e) => {
      state.blockUnjoinedGroupsEnabled = e.target.checked;
      chrome.storage.sync.set({ blockUnjoinedGroupsEnabled: state.blockUnjoinedGroupsEnabled });
    });
  }

  if (toggleCaptcha) {
    toggleCaptcha.addEventListener('change', (e) => {
      state.captchaSolverEnabled = e.target.checked;
      chrome.storage.sync.set({ captchaSolverEnabled: state.captchaSolverEnabled });
    });
  }

  if (toggleYoutube) {
    toggleYoutube.addEventListener('change', (e) => {
      state.youtubeNonstopEnabled = e.target.checked;
      chrome.storage.sync.set({ youtubeNonstopEnabled: state.youtubeNonstopEnabled });
    });
  }

  addUidBtn.addEventListener('click', addUid);

  uidInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addUid();
    }
  });

  // Open Side Panel button event listener
  const openSidebarBtn = document.getElementById('openSidebarBtn');
  if (openSidebarBtn) {
    openSidebarBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.open) {
        chrome.windows.getCurrent((win) => {
          chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
          window.close();
        });
      } else {
        alert('Trình duyệt hiện tại chưa hỗ trợ mở Side Panel trực tiếp!');
      }
    });
  }

  // Tab Navigation Listeners
  const tabMainBtn = document.getElementById('tabMainBtn');
  const tabExtBtn = document.getElementById('tabExtBtn');
  const tabMainContent = document.getElementById('tabMainContent');
  const tabExtContent = document.getElementById('tabExtContent');

  if (tabMainBtn && tabExtBtn) {
    tabMainBtn.addEventListener('click', () => {
      tabMainBtn.classList.add('active');
      tabExtBtn.classList.remove('active');
      tabMainContent.classList.remove('tab-content-hidden');
      tabExtContent.classList.add('tab-content-hidden');
    });

    tabExtBtn.addEventListener('click', () => {
      tabExtBtn.classList.add('active');
      tabMainBtn.classList.remove('active');
      tabExtContent.classList.remove('tab-content-hidden');
      tabMainContent.classList.add('tab-content-hidden');
      loadExtensionManager();
    });
  }

  // Extension Manager Engine
  const extSearchInput = document.getElementById('extSearchInput');
  const enableAllExtBtn = document.getElementById('enableAllExtBtn');
  const disableAllExtBtn = document.getElementById('disableAllExtBtn');
  const enabledExtGrid = document.getElementById('enabledExtGrid');
  const disabledExtGrid = document.getElementById('disabledExtGrid');
  const enabledCountBadge = document.getElementById('enabledCountBadge');
  const disabledCountBadge = document.getElementById('disabledCountBadge');

  let allExtensions = [];

  function loadExtensionManager() {
    if (typeof chrome === 'undefined' || !chrome.management) return;

    chrome.management.getAll((extensions) => {
      allExtensions = extensions.sort((a, b) => a.name.localeCompare(b.name));
      renderExtensionManager();
    });
  }

  function renderExtensionManager() {
    if (!enabledExtGrid || !disabledExtGrid) return;
    enabledExtGrid.innerHTML = '';
    disabledExtGrid.innerHTML = '';

    const query = (extSearchInput?.value || '').toLowerCase().trim();

    const filtered = allExtensions.filter(ext => {
      return ext.name.toLowerCase().includes(query);
    });

    const enabledList = filtered.filter(ext => ext.enabled);
    const disabledList = filtered.filter(ext => !ext.enabled);

    if (enabledCountBadge) enabledCountBadge.textContent = enabledList.length;
    if (disabledCountBadge) disabledCountBadge.textContent = disabledList.length;

    if (enabledList.length === 0) {
      enabledExtGrid.innerHTML = `<div class="empty-state">Không có extension nào.</div>`;
    } else {
      enabledList.forEach(ext => {
        enabledExtGrid.appendChild(createExtIconCard(ext));
      });
    }

    if (disabledList.length === 0) {
      disabledExtGrid.innerHTML = `<div class="empty-state">Không có extension nào.</div>`;
    } else {
      disabledList.forEach(ext => {
        disabledExtGrid.appendChild(createExtIconCard(ext));
      });
    }
  }

  // Create Icon Button for an Extension (Only icon, hover displays name & version tooltip)
  function createExtIconCard(ext) {
    const card = document.createElement('div');
    card.className = 'ext-icon-card';
    card.title = ext.name;

    const iconImg = document.createElement('img');
    const iconUrl = (ext.icons && ext.icons.length > 0)
      ? ext.icons[ext.icons.length - 1].url
      : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>';
    iconImg.src = iconUrl;
    card.appendChild(iconImg);

    // Quick Uninstall button on hover (Small red cross)
    if (ext.id !== chrome.runtime?.id) {
      const delBtn = document.createElement('span');
      delBtn.className = 'ext-delete-btn';
      delBtn.textContent = '✕';
      delBtn.title = `Gỡ cài đặt ${ext.name}`;

      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.management.uninstall(ext.id, { showConfirmDialog: true }, () => {
          allExtensions = allExtensions.filter(item => item.id !== ext.id);
          renderExtensionManager();
        });
      });

      card.appendChild(delBtn);
    }

    card.addEventListener('click', () => {
      const targetState = !ext.enabled;
      chrome.management.setEnabled(ext.id, targetState, () => {
        ext.enabled = targetState;
        renderExtensionManager();
      });
    });

    return card;
  }

  if (extSearchInput) {
    extSearchInput.addEventListener('input', renderExtensionManager);
  }

  if (enableAllExtBtn) {
    enableAllExtBtn.addEventListener('click', () => {
      if (typeof chrome === 'undefined' || !chrome.management) return;
      allExtensions.forEach(ext => {
        if (!ext.enabled) {
          chrome.management.setEnabled(ext.id, true);
          ext.enabled = true;
        }
      });
      renderExtensionManager();
    });
  }

  if (disableAllExtBtn) {
    disableAllExtBtn.addEventListener('click', () => {
      if (typeof chrome === 'undefined' || !chrome.management) return;
      allExtensions.forEach(ext => {
        if (ext.id !== chrome.runtime.id && ext.enabled) {
          chrome.management.setEnabled(ext.id, false);
          ext.enabled = false;
        }
      });
      renderExtensionManager();
    });
  }

  // Cookie Import Event Listeners & Logic
  const importCookieBtn = document.getElementById('importCookieBtn');
  const clearCookieBtn = document.getElementById('clearCookieBtn');
  const cookieArea = document.getElementById('cookieArea');
  const cookieDomainInput = document.getElementById('cookieDomainInput');
  const cookieStatusBadge = document.getElementById('cookieStatusBadge');

  if (importCookieBtn && cookieArea) {
    importCookieBtn.addEventListener('click', async () => {
      const raw = cookieArea.value || '';
      const domainVal = (cookieDomainInput ? cookieDomainInput.value : '') || '.facebook.com';
      if (!raw.trim()) {
        alert('Vui lòng dán chuỗi Cookie hoặc JSON vào ô nhập!');
        return;
      }

      const cookieList = parseCookies(raw, domainVal);
      if (cookieList.length === 0) {
        alert('Không tìm thấy dữ liệu Cookie hợp lệ!');
        return;
      }

      await importCookies(cookieList, domainVal);
    });
  }

  if (clearCookieBtn && cookieArea) {
    clearCookieBtn.addEventListener('click', () => {
      cookieArea.value = '';
      if (cookieStatusBadge) cookieStatusBadge.textContent = 'Sẵn sàng';
    });
  }

  // Parse Cookie string or JSON format into structured cookie objects
  function parseCookies(rawInput, defaultDomain) {
    const cookies = [];
    const trimmed = rawInput.trim();
    if (!trimmed) return cookies;

    let domain = defaultDomain.trim();
    if (!domain.startsWith('.')) {
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = '.' + domain;
      }
    }

    // Try parsing JSON format
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        list.forEach(item => {
          if (item && (item.name || item.key)) {
            cookies.push({
              name: String(item.name || item.key).trim(),
              value: String(item.value || '').trim(),
              domain: (item.domain || domain).trim(),
              path: item.path || '/'
            });
          }
        });
        if (cookies.length > 0) return cookies;
      } catch (e) {}
    }

    // Parse String Header format (c_user=123; xs=456) or Netscape format lines
    const lines = trimmed.split(/[\r\n;]+/);
    lines.forEach(line => {
      const parts = line.trim().split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (name && !name.startsWith('#') && !name.startsWith('//')) {
          cookies.push({
            name: name,
            value: value,
            domain: domain,
            path: '/'
          });
        }
      }
    });

    return cookies;
  }

  // Import cookie list into browser using chrome.cookies API
  async function importCookies(cookieList, domainInputStr) {
    if (typeof chrome === 'undefined' || !chrome.cookies) {
      alert('Trình duyệt chưa hỗ trợ chrome.cookies API!');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    if (cookieStatusBadge) cookieStatusBadge.textContent = 'Đang nạp...';

    for (let c of cookieList) {
      let cookieDomain = c.domain || domainInputStr;
      if (!cookieDomain.startsWith('.')) cookieDomain = '.' + cookieDomain.replace(/^https?:\/\//, '');

      const cleanHost = cookieDomain.replace(/^\./, '');
      const url = `https://www.${cleanHost}/`;

      try {
        await new Promise((resolve) => {
          chrome.cookies.set({
            url: url,
            name: c.name,
            value: c.value,
            domain: cookieDomain,
            path: c.path || '/',
            secure: true,
            sameSite: 'no_restriction'
          }, (result) => {
            if (chrome.runtime.lastError || !result) {
              failCount++;
            } else {
              successCount++;
            }
            resolve();
          });
        });
      } catch (e) {
        failCount++;
      }
    }

    if (cookieStatusBadge) {
      cookieStatusBadge.textContent = `Nạp ${successCount}/${cookieList.length}`;
    }

    alert(`Đã Import thành công ${successCount} cookie!${failCount > 0 ? ` (${failCount} thất bại)` : ''}`);
  }

  // Initial load
  loadState();
});
