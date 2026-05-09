#include <stdio.h>

int main() {
    int n;
    int c = 3;
    int f, g;

    printf("n\tf(n)=3n^2+4n+3\tc*g(n)=3n\n");
    printf("-------------------------------------\n");

    for(n = 10; n <= 30; n++) {
        f = 3*n*n + 4*n + 3;
        g = c * n;

        printf("%d\t%d\t\t%d\n", n, f, g);
    }

    printf("\nConclusion:\n");
    printf("f(n) >= c*g(n) for n >= 1\n");
    printf("So, f(n) = Omega(n)\n");
    printf("Here, c = 3 and n0 = 1\n");

    return 0;
}