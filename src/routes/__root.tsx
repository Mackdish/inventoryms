import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "InventoryMS — Smart inventory for growing businesses" },
      { name: "description", content: "Manage products, sales, purchases, and deliveries in one place. Built for Kenyan SMEs. 7-day free trial." },
      { property: "og:title", content: "InventoryMS — Smart inventory for growing businesses" },
      { name: "twitter:title", content: "InventoryMS — Smart inventory for growing businesses" },
      { property: "og:description", content: "Manage products, sales, purchases, and deliveries in one place. Built for Kenyan SMEs. 7-day free trial." },
      { name: "twitter:description", content: "Manage products, sales, purchases, and deliveries in one place. Built for Kenyan SMEs. 7-day free trial." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f8034484-e590-436c-a6b1-2e397a4f359a/id-preview-76ce8a5b--f64e41bd-92a9-498b-8f47-552a5341ef3d.lovable.app-1776937916851.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f8034484-e590-436c-a6b1-2e397a4f359a/id-preview-76ce8a5b--f64e41bd-92a9-498b-8f47-552a5341ef3d.lovable.app-1776937916851.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
