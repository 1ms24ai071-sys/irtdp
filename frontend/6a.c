#include <stdio.h>

int main() {
    int n;
    int c = 9;
    int f, g;

    printf("n\tf(n)\t\tc*n^2\n");
    printf("--------------------------------\n");

    for(n = 10; n <= 30; n++) {
        f = 8*n*n + 3*n + 3;
        g = c * n * n;

        printf("%d\t%d\t\t%d\n", n, f, g);
    }

    printf("\nConclusion:\n");
    printf("f(n) <= c*n^2 for n >= 3\n");
    printf("So, f(n) = O(n^2)\n");
    printf("Here, c = 9 and n0 = 3\n");

    return 0;
}