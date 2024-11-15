import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
      <DialogPrimitive.Content
        ref={ref}
        className={`fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg w-[90%] max-w-md ${className}`}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
);

DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}
    {...props}
  />
);

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
  />
));

DialogTitle.displayName = "DialogTitle";

export const DialogFooter = ({ className, ...props }) => (
  <div className={`flex justify-end space-x-2 mt-4 ${className}`} {...props} />
);
