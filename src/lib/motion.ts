import type { Variants, Transition } from "framer-motion";

export const easeOut: Transition["ease"] = [0.16, 1, 0.3, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
};

export const stagger = (delay = 0.05): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});

export const cardPress = {
  whileTap: { scale: 0.98 },
  whileHover: { y: -2 },
  transition: { type: "spring" as const, stiffness: 400, damping: 24 },
};

export const springProgress: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 22,
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: easeOut } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};
