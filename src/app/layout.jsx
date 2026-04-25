import "./globals.css";

export const metadata = {
  title: "Color Theory Studio",
  description:
    "Explore color harmonies interactively — pick a hue, choose a harmony type, and see your palette on 3D spheres.",
  openGraph: {
    title: "Color Theory Studio",
    description: "Interactive color harmony explorer with 3D sphere previews.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
