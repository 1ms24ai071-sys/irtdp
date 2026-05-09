#include <stdio.h>

int main() {
    int n;
    int c = 8;   // constant
    int f, g;

    printf("n\tf(n)=7n+5\tc*g(n)=8n\n");
    printf("--------------------------------\n");

    for(n = 10; n <= 30; n++) {
        f = 7*n + 5;
        g = c * n;

        printf("%d\t%d\t\t%d\n", n, f, g);
    }

    printf("\nConclusion:\n");
    printf("f(n) <= c*g(n) for n >= 5\n");
    printf("So, f(n) = O(n)\n");
    printf("Here, c = 8 and n0 = 5\n");

    return 0;
}