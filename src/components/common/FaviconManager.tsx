"use client";

import { useEffect } from "react";
import { subscribeToSchoolDetails } from "@/lib/services/schoolService";

export default function FaviconManager() {
  useEffect(() => {
    const unsub = subscribeToSchoolDetails((school) => {
      if (school?.logo_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = school.logo_url;
      }
    });
    return () => unsub();
  }, []);

  return null;
}
