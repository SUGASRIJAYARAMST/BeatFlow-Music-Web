declare module "@cashfreepayments/cashfree-js" {
  interface Cashfree {
    checkout(options: {
      paymentSessionId: string;
      returnUrl: string;
    }): Promise<{
      error?: { message: string };
      referenceId?: string;
    }>;
  }

  interface LoadOptions {
    mode?: "sandbox" | "production";
  }

  function load(options?: LoadOptions): Promise<Cashfree>;

  export { load, Cashfree, LoadOptions };
}
