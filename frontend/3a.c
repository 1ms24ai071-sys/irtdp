#include <stdio.h>

int main() {
    int n;
    int c1 = 7, c2 = 8;
    int f, g1, g2;

    printf("n\tf(n)\t\tc1*n^2\t\tc2*n^2\n");
    printf("------------------------------------------------\n");

    for(n = 10; n <= 30; n++) {
        f = 7*n*n + 7*n + 5;
        g1 = c1 * n * n;
        g2 = c2 * n * n;

        printf("%d\t%d\t\t%d\t\t%d\n", n, f, g1, g2);
    }

    printf("\nConclusion:\n");
    printf("7n^2 <= f(n) <= 8n^2 for n >= 5\n");
    printf("So, f(n) = Theta(n^2)\n");
    printf("Here, c1 = 7, c2 = 8 and n0 = 5\n");

    return 0;
}