export class Timeout {
  static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
