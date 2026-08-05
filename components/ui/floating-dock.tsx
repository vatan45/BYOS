"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: {
    title: string;
    icon: React.ReactNode;
    href: string;
    matchExact?: boolean;
  }[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href: string; matchExact?: boolean }[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className={cn("relative block md:hidden z-50", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute bottom-full mb-2 inset-x-0 flex flex-col gap-2 p-3 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {items.map((item, idx) => {
              const isActive = item.matchExact
                ? pathname === item.href
                : pathname?.startsWith(item.href);

              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors",
                      isActive
                        ? "bg-stone-800 text-emerald-400 border border-emerald-500/30 font-bold"
                        : "text-stone-400 hover:bg-stone-800/50 hover:text-stone-200"
                    )}
                  >
                    <div className="w-5 h-5">{item.icon}</div>
                    <span>{item.title}</span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="h-14 px-5 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-between w-full shadow-[0_0_20px_rgba(0,0,0,0.5)] text-stone-200 text-sm font-bold"
      >
        <span className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Quick Navigation Dock</span>
        </span>
        <span className="text-xs font-mono bg-stone-800 px-2.5 py-1 rounded-full text-stone-400">
          {open ? "Close ▲" : "Menu ▼"}
        </span>
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href: string; matchExact?: boolean }[];
  className?: string;
}) => {
  const mouseX = useMotionValue(Infinity);
  const pathname = usePathname();

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden md:flex h-16 gap-4 items-end rounded-2xl bg-stone-950/90 border border-stone-800/80 px-4 pb-3 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.6)] z-50",
        className
      )}
    >
      {items.map((item) => (
        <IconContainer
          mouseX={mouseX}
          key={item.title}
          {...item}
          isActive={
            item.matchExact ? pathname === item.href : pathname?.startsWith(item.href)
          }
        />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  isActive,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href: string;
  isActive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 70, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 70, 40]);
  const iconSizeTransform = useTransform(distance, [-150, 0, 150], [20, 32, 20]);

  const width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });

  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href}>
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-stone-900 border transition-colors shadow-lg",
          isActive
            ? "border-emerald-500/60 bg-stone-800 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            : "border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700"
        )}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-800 border border-stone-700 px-2.5 py-1 text-[11px] font-bold text-stone-200 shadow-xl pointer-events-none z-50"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: iconSizeTransform, height: iconSizeTransform }}
          className="flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </motion.div>
    </Link>
  );
}
