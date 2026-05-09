#include <stdio.h>

int main() {
    int n;
    int c = 5;
    int f, g;

    printf("n\tf(n)=4n+3\tc*g(n)=5n\n");
    printf("--------------------------------\n");

    for(n = 10; n <= 30; n++) {
        f = 4*n + 3;
        g = c * n;

        printf("%d\t%d\t\t%d\n", n, f, g);
    }

    printf("\nConclusion:\n");
    printf("f(n) <= c*g(n) for n >= 3\n");
    printf("So, f(n) = O(n)\n");
    printf("Here, c = 5 and n0 = 3\n");

    return 0;
}