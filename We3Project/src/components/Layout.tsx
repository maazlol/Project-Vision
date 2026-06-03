import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col bg-gray-50">
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};

export default Layout;
