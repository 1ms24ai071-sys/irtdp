#include <stdio.h>

#define N 8

// Function to count inversions
int countInversions(int a[]) {
    int count = 0;

    for(int i = 0; i < N; i++) {
        for(int j = i + 1; j < N; j++) {
            if(a[i] > a[j]) {
                count++;
            }
        }
    }

    return count;
}

int main() {
    // 3 users playlist (example)
    int user1[N] = {1,2,3,4,5,6,7,8};
    int user2[N] = {2,1,4,3,6,5,8,7};
    int user3[N] = {8,7,6,5,4,3,2,1};

    int inv1 = countInversions(user1);
    int inv2 = countInversions(user2);
    int inv3 = countInversions(user3);

    printf("User1 Inversions: %d\n", inv1);
    printf("User2 Inversions: %d\n", inv2);
    printf("User3 Inversions: %d\n", inv3);

    // Find minimum
    int min = inv1;
    int user = 1;

    if(inv2 < min) {
        min = inv2;
        user = 2;
    }
    if(inv3 < min) {
        min = inv3;
        user = 3;
    }

    printf("\nRecommended playlist: User %d (minimum inversions)\n", user);

    return 0;
}