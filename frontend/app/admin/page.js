'use client';
import { useEffect } from 'react';

const AdminPage = () => {
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    const derivedAdminUrl = apiBase
      ? `${apiBase.replace(/\/api\/?$/, '')}/admin/login.html`
      : '/owner-basic';
    const adminPanelUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || derivedAdminUrl;
    window.location.replace(adminPanelUrl);
  }, []);

  return null;
};

export default AdminPage;
