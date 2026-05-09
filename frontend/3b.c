#include <stdio.h>
#include <time.h>

void merge(int a[], int l, int m, int r) {
    int i = l, j = m + 1, k = l;
    int temp[100];

    while(i <= m && j <= r) {
        if(a[i] < a[j])
            temp[k++] = a[i++];
        else
            temp[k++] = a[j++];
    }

    while(i <= m)
        temp[k++] = a[i++];

    while(j <= r)
        temp[k++] = a[j++];

    for(i = l; i <= r; i++)
        a[i] = temp[i];
}

void mergesort(int a[], int l, int r) {
    if(l < r) {
        int m = (l + r) / 2;
        mergesort(a, l, m);
        mergesort(a, m+1, r);
        merge(a, l, m, r);
    }
}

int main() {
    int n, i, a[100];

    printf("Enter n: ");
    scanf("%d", &n);

    printf("Enter elements:\n");
    for(i = 0; i < n; i++)
        scanf("%d", &a[i]);

    clock_t start = clock();

    mergesort(a, 0, n-1);

    clock_t end = clock();

    printf("Sorted array:\n");
    for(i = 0; i < n; i++)
        printf("%d ", a[i]);

    printf("\nTime: %lf seconds", (double)(end-start)/CLOCKS_PER_SEC);

    return 0;
}