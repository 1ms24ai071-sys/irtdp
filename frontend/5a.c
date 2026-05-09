#include <stdio.h>

int main() {
    int n;
    int c = 5;
    int f, g;

    printf("n\tf(n)=5n+5\tc*g(n)=5n\n");
    printf("--------------------------------\n");

    for(n = 10; n <= 30; n++) {
        f = 5*n + 5;
        g = c * n;

        printf("%d\t%d\t\t%d\n", n, f, g);
    }

    printf("\nConclusion:\n");
    printf("f(n) >= c*g(n) for n >= 1\n");
    printf("So, f(n) = Omega(n)\n");
    printf("Here, c = 5 and n0 = 1\n");

    return 0;
}