"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";

export const GlareCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const isPointerInside = useRef(false);
  const refElement = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({
    glare: {
      x: 50,
      y: 50,
      opacity: 0,
    },
    background: {
      x: 50,
      y: 50,
    },
    rotate: {
      x: 0,
      y: 0,
    },
  });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rotateFactor = 0.4;
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const percentage = {
      x: (100 / rect.width) * position.x,
      y: (100 / rect.height) * position.y,
    };
    const delta = {
      x: percentage.x - 50,
      y: percentage.y - 50,
    };

    const rotate = {
      x: -(delta.x / 3.5) * rotateFactor,
      y: (delta.y / 2) * rotateFactor,
    };

    setState({
      glare: {
        x: percentage.x,
        y: percentage.y,
        opacity: 0.35,
      },
      background: {
        x: percentage.x,
        y: percentage.y,
      },
      rotate: {
        x: rotate.x,
        y: rotate.y,
      },
    });
  };

  const handlePointerEnter = () => {
    isPointerInside.current = true;
    if (refElement.current) {
      setTimeout(() => {
        if (isPointerInside.current) {
          refElement.current?.style.setProperty("--duration", "0s");
        }
      }, 300);
    }
  };

  const handlePointerLeave = () => {
    isPointerInside.current = false;
    if (refElement.current) {
      refElement.current.style.removeProperty("--duration");
      refElement.current?.style.setProperty("--duration", "300ms");
    }
    setState({
      glare: {
        x: 50,
        y: 50,
        opacity: 0,
      },
      background: {
        x: 50,
        y: 50,
      },
      rotate: {
        x: 0,
        y: 0,
      },
    });
  };

  return (
    <div
      style={{
        transform: `rotateY(${state.rotate.x}deg) rotateX(${state.rotate.y}deg)`,
        transition: "transform var(--duration, 300ms) ease-out",
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "relative w-full rounded-3xl overflow-hidden bg-stone-950 border-2 border-emerald-500/40 p-8 shadow-[0_0_45px_rgba(16,185,129,0.15)] transition-all",
        className
      )}
      ref={refElement}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-10 rounded-3xl"
        style={{
          background: `radial-gradient(farthest-corner circle at ${state.glare.x}% ${state.glare.y}%, rgba(16, 185, 129, 0.45) 10%, rgba(34, 211, 238, 0.2) 35%, transparent 70%)`,
          opacity: state.glare.opacity,
          mixBlendMode: "overlay",
        }}
      />
      <div className="relative z-20">{children}</div>
    </div>
  );
};
