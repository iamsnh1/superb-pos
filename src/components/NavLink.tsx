import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Define a type for the function signature of className
type NavLinkClassNameFunction = (props: {
  isActive: boolean;
  isPending: boolean;
}) => string | undefined;

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  // Allow className to be a string, a function, or undefined
  className?: string | NavLinkClassNameFunction;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) => {
          // Resolve the base className if it's a function
          const baseClassName =
            typeof className === "function"
              ? className({ isActive, isPending })
              : className;

          return cn(
            baseClassName,
            isActive && activeClassName,
            isPending && pendingClassName,
          );
        }}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
