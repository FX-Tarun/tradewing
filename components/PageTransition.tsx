"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [displayChildren, setDisplayChildren] = useState(children);
  const [visible, setVisible] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (children === displayChildren) return;

    setTransitioning(true);
    setVisible(false);

    const timer = window.setTimeout(() => {
      setDisplayChildren(children);

      requestAnimationFrame(() => {
        setVisible(true);

        window.setTimeout(() => {
          setTransitioning(false);
        }, 280);
      });
    }, 140);

    return () => window.clearTimeout(timer);
  }, [pathname, children, displayChildren]);

  return (
    <div
      className={`page-transition-wrapper ${
        visible ? "page-transition-visible" : "page-transition-hidden"
      } ${transitioning ? "page-transition-active" : ""}`}
    >
      {displayChildren}
    </div>
  );
}