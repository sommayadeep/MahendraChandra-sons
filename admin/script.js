(function () {
  var savedApiBase = localStorage.getItem('admin_api_base') || '';
  var sameOriginApiBase = (window.location.origin + '/api').replace(/\/$/, '');
  var isLocalHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!isLocalHost && savedApiBase && savedApiBase.indexOf('http://localhost') === 0) {
    localStorage.removeItem('admin_api_base');
    savedApiBase = '';
  }

  var API_BASE = (isLocalHost && savedApiBase ? savedApiBase : sameOriginApiBase).replace(/\/$/, '');
  var PENDING_COUNT_KEY = 'admin_last_pending_count';
  var RETURN_COUNT_KEY = 'admin_last_requested_returns_count';

  function getToken() {
    return localStorage.getItem('token');
  }

  function jsonHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken()
    };
  }

  function authHeaderOnly() {
    return {
      Authorization: 'Bearer ' + getToken()
    };
  }

  function setMessage(elId, text, ok) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = text;
    el.className = ok ? 'success' : 'error';
  }

  function setAnyMessage(text, ok) {
    if (document.getElementById('dashboardMessage')) {
      setMessage('dashboardMessage', text, ok);
      return;
    }
    if (document.getElementById('ordersMessage')) {
      setMessage('ordersMessage', text, ok);
      return;
    }
    if (document.getElementById('returnsMessage')) {
      setMessage('returnsMessage', text, ok);
    }
  }

  async function parseResponse(res) {
    var data = await res.json().catch(function () {
      return {};
    });

    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/admin/login.html';
      throw new Error('Session expired. Please login again.');
    }

    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  async function request(path, options) {
    var res = await fetch(API_BASE + path, options || {});
    return parseResponse(res);
  }

  function formatMoney(value) {
    var num = Number(value || 0);
    return isNaN(num) ? '0' : String(num);
  }

  function getItemName(item) {
    if (!item) return 'Product';
    if (item.name) return item.name;
    if (item.product && item.product.name) return item.product.name;
    return 'Product';
  }

  function getItemImage(item) {
    if (!item) return '';
    if (item.image) return item.image;
    if (item.product) {
      if (item.product.image) return item.product.image;
      if (item.product.images && item.product.images.length > 0) return item.product.images[0];
    }
    return '';
  }

  function getOrderAddress(order) {
    if (order.shippingDetails) {
      var sd = order.shippingDetails;
      var line1 = sd.address || '-';
      var line2 = [sd.city, sd.pincode].filter(Boolean).join(' - ');
      return line2 ? line1 + ', ' + line2 : line1;
    }
    if (order.shippingAddress) {
      var sa = order.shippingAddress;
      var l1 = sa.address || '-';
      var l2 = [sa.city, sa.state, sa.pincode].filter(Boolean).join(', ');
      return l2 ? l1 + ', ' + l2 : l1;
    }
    return '-';
  }

  function ensureAuthenticatedPage() {
    if (!getToken()) {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  }

  function bindLogoutButton() {
    var logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('token');
      window.location.href = '/admin/login.html';
    });
  }

  function ensureModernDashboardLayout() {
    var isDashboard = window.location.pathname.indexOf('/admin/dashboard.html') >= 0;
    if (!isDashboard) return;

    var quickGrid = document.querySelector('.quick-access-grid');
    if (!quickGrid) {
      var h1 = document.querySelector('h1');
      if (h1) {
        var grid = document.createElement('div');
        grid.className = 'quick-access-grid';
        grid.innerHTML =
          '<a class=\"quick-box\" href=\"#productsSection\"><h3>Products</h3><p>Add, update, delete products</p></a>' +
          '<a class=\"quick-box\" href=\"/admin/orders.html\"><h3>Orders Portal</h3><p>Manage all customer orders</p></a>' +
          '<a class=\"quick-box\" href=\"/admin/returns.html\"><h3>Return/Exchange Portal</h3><p>Handle return and exchange requests</p></a>';
        h1.insertAdjacentElement('afterend', grid);
      }
    }

    // Hide legacy combined sections if old HTML is cached by browser.
    var cards = document.querySelectorAll('.card');
    cards.forEach(function (card) {
      var title = (card.querySelector('h2') || {}).textContent || '';
      if (title.indexOf('Order Management') >= 0 || title.indexOf('Return / Exchange Requests') >= 0) {
        card.style.display = 'none';
      }
    });
  }

  async function fetchOrdersData() {
    return request('/orders', {
      method: 'GET',
      headers: jsonHeaders()
    });
  }

  async function fetchReturnsData() {
    return request('/orders/returns', {
      method: 'GET',
      headers: jsonHeaders()
    });
  }

  async function loadProducts() {
    var tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;

    var data = await request('/products', {
      method: 'GET',
      headers: jsonHeaders()
    });

    tbody.innerHTML = '';
    (data.products || []).forEach(function (p) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + p._id + '</td>' +
        '<td>' + (p.name || '') + '</td>' +
        '<td>' + formatMoney(p.price) + '</td>' +
        '<td>' + (p.salePrice != null ? formatMoney(p.salePrice) : '-') + '</td>' +
        '<td>' + (p.stock != null ? p.stock : '') + '</td>';
      tbody.appendChild(tr);
    });
  }

  async function loadOrders() {
    var tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    var data = await fetchOrdersData();
    tbody.innerHTML = '';

    (data.orders || []).forEach(function (o) {
      var tr = document.createElement('tr');
      if (o.orderStatus === 'Pending') tr.classList.add('pending-row');

      var customerName = (o.user && o.user.name) || (o.shippingDetails && o.shippingDetails.name) || '-';
      var customerPhone = (o.shippingDetails && o.shippingDetails.phone) || o.phone || (o.user && o.user.phone) || '-';
      var address = getOrderAddress(o);
      var items = (o.items && o.items.length > 0 ? o.items : o.orderItems) || [];

      var productsHtml = items.map(function (item) {
        var image = getItemImage(item);
        var name = getItemName(item);
        var qty = item.quantity || 1;
        var price = formatMoney(item.price || 0);
        var imgTag = image ? '<img src="' + image + '" alt="' + name + '" style="width:36px;height:36px;object-fit:cover;display:block;margin-bottom:4px;" />' : '';
        return '<div style="margin-bottom:8px;">' + imgTag + name + ' x ' + qty + ' (Rs. ' + price + ')</div>';
      }).join('');

      tr.innerHTML =
        '<td>' + o._id + '</td>' +
        '<td>' + customerName + '</td>' +
        '<td>' + customerPhone + '</td>' +
        '<td>' + address + '</td>' +
        '<td>' + (productsHtml || '-') + '</td>' +
        '<td>' + formatMoney(o.totalAmount || o.totalPrice) + '</td>' +
        '<td>' + (o.orderStatus || '-') + '</td>' +
        '<td>' + (o.trackingId || '-') + '</td>';

      var actions = document.createElement('td');

      var acceptBtn = document.createElement('button');
      acceptBtn.textContent = 'Accept';
      acceptBtn.disabled = o.orderStatus !== 'Pending';
      acceptBtn.onclick = async function () {
        try {
          await request('/orders/' + o._id + '/accept', {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({})
          });
          setAnyMessage('Order accepted', true);
          await loadOrders();
        } catch (err) {
          setAnyMessage(err.message, false);
        }
      };

      var trackingInput = document.createElement('input');
      trackingInput.placeholder = 'Tracking ID';
      trackingInput.value = o.trackingId || '';

      var trackingBtn = document.createElement('button');
      trackingBtn.textContent = 'Add Tracking';
      trackingBtn.onclick = async function () {
        try {
          await request('/orders/' + o._id + '/tracking', {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({ trackingId: trackingInput.value.trim() })
          });
          setAnyMessage('Tracking added and status moved to shipped', true);
          await loadOrders();
        } catch (err) {
          setAnyMessage(err.message, false);
        }
      };

      var statusSelect = document.createElement('select');
      ['Pending', 'Accepted', 'Shipped', 'Delivered', 'Cancelled'].forEach(function (s) {
        var option = document.createElement('option');
        option.value = s;
        option.textContent = s;
        if (o.orderStatus === s) option.selected = true;
        statusSelect.appendChild(option);
      });

      var statusBtn = document.createElement('button');
      statusBtn.textContent = 'Update Status';
      statusBtn.onclick = async function () {
        try {
          await request('/orders/' + o._id + '/status', {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({ orderStatus: statusSelect.value })
          });
          setAnyMessage('Order status updated', true);
          await loadOrders();
        } catch (err) {
          setAnyMessage(err.message, false);
        }
      };

      var deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete Order';
      deleteBtn.onclick = async function () {
        var ok = window.confirm('Delete this order permanently?');
        if (!ok) return;

        try {
          await request('/orders/' + o._id, {
            method: 'DELETE',
            headers: jsonHeaders()
          });
          setAnyMessage('Order deleted', true);
          await loadOrders();
        } catch (err) {
          setAnyMessage(err.message, false);
        }
      };

      actions.appendChild(acceptBtn);
      actions.appendChild(trackingInput);
      actions.appendChild(trackingBtn);
      actions.appendChild(statusSelect);
      actions.appendChild(statusBtn);
      actions.appendChild(deleteBtn);
      tr.appendChild(actions);

      tbody.appendChild(tr);
    });
  }

  async function loadReturnExchangeRequests() {
    var tbody = document.querySelector('#returnsTable tbody');
    if (!tbody) return;

    var data = await fetchReturnsData();
    tbody.innerHTML = '';

    (data.requests || []).forEach(function (r) {
      var tr = document.createElement('tr');
      var refundMode = r.refundMode || '-';
      var upiId = r.upiId || '-';
      var bankDetails = [
        r.accountHolderName ? 'Name: ' + r.accountHolderName : '',
        r.bankName ? 'Bank: ' + r.bankName : '',
        r.accountNumber ? 'A/C: ' + r.accountNumber : '',
        r.ifscCode ? 'IFSC: ' + r.ifscCode : ''
      ].filter(Boolean).join(' | ') || '-';

      tr.innerHTML =
        '<td>' + (r.requestId || '') + '</td>' +
        '<td>' + (r.orderId || '') + '</td>' +
        '<td>' + (r.customerUid || '-') + '</td>' +
        '<td>' + (r.customerName || '-') + '</td>' +
        '<td>' + (r.customerPhone || '-') + '</td>' +
        '<td>' + (r.requestType || '-') + '</td>' +
        '<td>' + (r.reason || '-') + '</td>' +
        '<td>' + refundMode + '</td>' +
        '<td>' + upiId + '</td>' +
        '<td>' + bankDetails + '</td>' +
        '<td>' + (r.status || '-') + '</td>' +
        '<td>' + (r.createdAt ? new Date(r.createdAt).toLocaleString() : '-') + '</td>';

      var actions = document.createElement('td');
      var statusSelect = document.createElement('select');
      ['Requested', 'Approved', 'Rejected', 'Completed'].forEach(function (s) {
        var option = document.createElement('option');
        option.value = s;
        option.textContent = s;
        if (r.status === s) option.selected = true;
        statusSelect.appendChild(option);
      });

      var updateBtn = document.createElement('button');
      updateBtn.textContent = 'Update';
      updateBtn.onclick = async function () {
        try {
          await request('/orders/returns/' + r.requestId + '/status', {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({ status: statusSelect.value })
          });
          setAnyMessage('Return/Exchange status updated', true);
          await loadReturnExchangeRequests();
        } catch (err) {
          setAnyMessage(err.message, false);
        }
      };

      actions.appendChild(statusSelect);
      actions.appendChild(updateBtn);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
  }

  function maybeNotify(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body: body });
    }
  }

  async function updateDashboardCountsAndNotifications() {
    var totalOrdersEl = document.getElementById('totalOrdersCount');
    var pendingOrdersEl = document.getElementById('pendingOrdersCount');
    var totalReturnsEl = document.getElementById('totalReturnsCount');
    var requestedReturnsEl = document.getElementById('requestedReturnsCount');
    var newItemsMessageEl = document.getElementById('newItemsMessage');

    if (!totalOrdersEl || !pendingOrdersEl || !totalReturnsEl || !requestedReturnsEl) return;

    var ordersData = await fetchOrdersData();
    var returnsData = await fetchReturnsData();

    var orders = ordersData.orders || [];
    var returns = returnsData.requests || [];
    var pendingOrders = orders.filter(function (o) { return o.orderStatus === 'Pending'; });
    var requestedReturns = returns.filter(function (r) { return r.status === 'Requested'; });

    totalOrdersEl.textContent = String(orders.length);
    pendingOrdersEl.textContent = String(pendingOrders.length);
    totalReturnsEl.textContent = String(returns.length);
    requestedReturnsEl.textContent = String(requestedReturns.length);

    var prevPending = Number(localStorage.getItem(PENDING_COUNT_KEY) || '0');
    var prevRequested = Number(localStorage.getItem(RETURN_COUNT_KEY) || '0');

    var pendingIncrease = Math.max(0, pendingOrders.length - prevPending);
    var requestedIncrease = Math.max(0, requestedReturns.length - prevRequested);

    localStorage.setItem(PENDING_COUNT_KEY, String(pendingOrders.length));
    localStorage.setItem(RETURN_COUNT_KEY, String(requestedReturns.length));

    var messages = [];
    if (pendingIncrease > 0) {
      messages.push(pendingIncrease + ' new pending order(s)');
      maybeNotify('New Orders', pendingIncrease + ' new pending order(s) received.');
    }
    if (requestedIncrease > 0) {
      messages.push(requestedIncrease + ' new return/exchange request(s)');
      maybeNotify('New Returns/Exchanges', requestedIncrease + ' new return/exchange request(s) received.');
    }

    if (newItemsMessageEl) {
      newItemsMessageEl.textContent = messages.length > 0 ? messages.join(' | ') : 'No new order/return alerts.';
      newItemsMessageEl.className = messages.length > 0 ? 'success' : '';
    }
  }

  function setupLoginPage() {
    var form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      setMessage('loginMessage', '', true);

      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;

      try {
        var data = await request('/auth/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password })
        });

        localStorage.setItem('token', data.token);
        window.location.href = '/admin/dashboard.html?v=4';
      } catch (err) {
        setMessage('loginMessage', err.message, false);
      }
    });
  }

  function setupDashboardPage() {
    if (!document.getElementById('addProductForm')) return;
    if (!ensureAuthenticatedPage()) return;
    ensureModernDashboardLayout();
    bindLogoutButton();

    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function () {
        try {
          await loadProducts();
          await updateDashboardCountsAndNotifications();
          setMessage('dashboardMessage', 'Data refreshed', true);
        } catch (err) {
          setMessage('dashboardMessage', err.message, false);
        }
      });
    }

    var notificationsBtn = document.getElementById('enableNotificationsBtn');
    if (notificationsBtn) {
      notificationsBtn.addEventListener('click', async function () {
        if (!('Notification' in window)) {
          setMessage('dashboardMessage', 'Browser notifications are not supported', false);
          return;
        }
        var permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setMessage('dashboardMessage', 'Notifications enabled', true);
        } else {
          setMessage('dashboardMessage', 'Notifications blocked by browser', false);
        }
      });
    }

    var cleanDuplicatesBtn = document.getElementById('cleanDuplicatesBtn');
    if (cleanDuplicatesBtn) {
      cleanDuplicatesBtn.addEventListener('click', async function () {
        try {
          var data = await request('/products/deduplicate', {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({})
          });
          setMessage('dashboardMessage', data.message || 'Duplicates removed', true);
          await loadProducts();
        } catch (err) {
          setMessage('dashboardMessage', err.message, false);
        }
      });
    }

    document.getElementById('addProductForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target;
      var imageFile = f.image.files && f.image.files[0];

      if (!imageFile) {
        setMessage('dashboardMessage', 'Product image is required', false);
        return;
      }

      var formData = new FormData();
      formData.append('name', f.name.value.trim());
      formData.append('description', f.description.value.trim());
      formData.append('category', f.category.value);
      formData.append('price', String(f.price.value));
      if (f.salePrice.value !== '') {
        formData.append('salePrice', String(f.salePrice.value));
      }
      formData.append('stock', String(f.stock.value));
      formData.append('image', imageFile);

      try {
        var res = await fetch(API_BASE + '/products', {
          method: 'POST',
          headers: authHeaderOnly(),
          body: formData
        });
        await parseResponse(res);
        f.reset();
        setMessage('dashboardMessage', 'Product added', true);
        await loadProducts();
      } catch (err) {
        setMessage('dashboardMessage', err.message, false);
      }
    });

    document.getElementById('updateProductForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target;
      var id = f.id.value.trim();
      var payload = {
        price: Number(f.price.value),
        salePrice: f.salePrice.value === '' ? undefined : Number(f.salePrice.value),
        stock: Number(f.stock.value)
      };

      try {
        await request('/products/' + id, {
          method: 'PUT',
          headers: jsonHeaders(),
          body: JSON.stringify(payload)
        });
        setMessage('dashboardMessage', 'Product updated', true);
        await loadProducts();
      } catch (err) {
        setMessage('dashboardMessage', err.message, false);
      }
    });

    document.getElementById('deleteProductForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var id = e.target.id.value.trim();
      try {
        await request('/products/' + id, {
          method: 'DELETE',
          headers: jsonHeaders()
        });
        setMessage('dashboardMessage', 'Product deleted', true);
        await loadProducts();
      } catch (err) {
        setMessage('dashboardMessage', err.message, false);
      }
    });

    (async function init() {
      try {
        await loadProducts();
        await updateDashboardCountsAndNotifications();
        setInterval(function () {
          updateDashboardCountsAndNotifications().catch(function () {});
        }, 30000);
      } catch (err) {
        setMessage('dashboardMessage', err.message, false);
      }
    })();
  }

  function setupOrdersPage() {
    if (!document.getElementById('ordersTable')) return;
    if (!ensureAuthenticatedPage()) return;
    bindLogoutButton();

    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function () {
        try {
          await loadOrders();
          setMessage('ordersMessage', 'Orders refreshed', true);
        } catch (err) {
          setMessage('ordersMessage', err.message, false);
        }
      });
    }

    (async function init() {
      try {
        await loadOrders();
      } catch (err) {
        setMessage('ordersMessage', err.message, false);
      }
    })();
  }

  function setupReturnsPage() {
    if (!document.getElementById('returnsTable')) return;
    if (!ensureAuthenticatedPage()) return;
    bindLogoutButton();

    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function () {
        try {
          await loadReturnExchangeRequests();
          setMessage('returnsMessage', 'Requests refreshed', true);
        } catch (err) {
          setMessage('returnsMessage', err.message, false);
        }
      });
    }

    (async function init() {
      try {
        await loadReturnExchangeRequests();
      } catch (err) {
        setMessage('returnsMessage', err.message, false);
      }
    })();
  }

  setupLoginPage();
  setupDashboardPage();
  setupOrdersPage();
  setupReturnsPage();
})();
