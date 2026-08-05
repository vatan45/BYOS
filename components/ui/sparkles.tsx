"use client";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SparklesCoreProps {
  id?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
  className?: string;
}

export const SparklesCore = ({
  id = "tsparticles",
  background = "transparent",
  minSize = 0.6,
  maxSize = 1.4,
  speed = 1,
  particleColor = "#10B981",
  particleDensity = 100,
  className,
}: SparklesCoreProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<
    Array<{ x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles
    const newParticles = Array.from({ length: particleDensity }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * (maxSize - minSize) + minSize,
      speedX: (Math.random() - 0.5) * speed * 0.5,
      speedY: (Math.random() - 0.5) * speed * 0.5,
      opacity: Math.random(),
    }));
    setParticles(newParticles);

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      newParticles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += (Math.random() - 0.5) * 0.02;
        p.opacity = Math.max(0.1, Math.min(1, p.opacity));

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [particleDensity, minSize, maxSize, speed, particleColor]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={cn("absolute inset-0 w-full h-full", className)}
      style={{ background }}
    />
  );
};
