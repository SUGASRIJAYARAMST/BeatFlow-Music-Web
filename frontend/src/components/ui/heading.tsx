import { cn } from "../../lib/utils";

type HeadingSize = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingProps = {
  size?: HeadingSize;
  className?: string;
  children: React.ReactNode;
};

const Heading = ({ 
  size = 2 as HeadingSize, 
  className = "", 
  children 
}: HeadingProps) => {
  // Map size to heading element and base font size
  let Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" = "h2";
  
  switch (size) {
    case 1: Tag = "h1"; break;
    case 2: Tag = "h2"; break;
    case 3: Tag = "h3"; break;
    case 4: Tag = "h4"; break ;
    case 5: Tag = "h5"; break;
    case 6: Tag = "h6"; break;
  }

  // Base classes for heading styling
  const baseClasses = "font-semibold text-base-content tracking-tight";

  // Size-specific classes
  let sizeClasses = "text-4xl";
  
  switch (size) {
    case 1: sizeClasses = "text-5xl"; break;
    case 2: sizeClasses = "text-4xl"; break;
    case 3: sizeClasses = "text-3xl"; break;
    case 4: sizeClasses = "text-2xl"; break;
    case 5: sizeClasses = "text-xl"; break;
    case 6: sizeClasses = "text-lg"; break;
  }

  return (
    // @ts-ignore
    <Tag className={cn(baseClasses, sizeClasses, className)}>
      {children}
    </Tag>
  );
};

export { Heading };