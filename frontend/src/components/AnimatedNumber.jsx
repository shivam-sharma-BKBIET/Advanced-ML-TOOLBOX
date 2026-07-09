import React, { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export default function AnimatedNumber({ value, suffix = "", prefix = "", decimalPlaces = 0 }) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 20,
    mass: 1,
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (current) => {
    const formatted = parseFloat(current).toFixed(decimalPlaces);
    return `${prefix}${formatted}${suffix}`;
  });

  return <motion.span>{display}</motion.span>;
}
