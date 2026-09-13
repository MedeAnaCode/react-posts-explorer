import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { NotFoundPage } from '../pages/NotFoundPage';
import { PostPage } from '../pages/PostPage';
import { PostsPage } from '../pages/PostsPage';
import { SiteHeader } from '../shared/ui';

export function AppRouter() {
  return (
    <BrowserRouter>
      <SiteHeader />
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/posts?page=1&limit=10" replace />}
        />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/:postId" element={<PostPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
