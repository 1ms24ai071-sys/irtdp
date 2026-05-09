#include <stdio.h>
#include <string.h>

#define N 3

int main() {
    // Men: A=0, B=1, C=2
    // Women: V=0, W=1, X=2

    int men_pref[N][N] = {
        {0, 1, 2}, // A -> V W X
        {1, 0, 2}, // B -> W V X
        {0, 1, 2}  // C -> V W X
    };

    int women_pref[N][N] = {
        {0, 1, 2}, // V -> A B C
        {1, 2, 0}, // W -> B C A
        {2, 0, 1}  // X -> C A B
    };

    int women_partner[N];
    int men_free[N];
    int next_proposal[N];

    // Initialize
    for(int i = 0; i < N; i++) {
        women_partner[i] = -1;
        men_free[i] = 1;
        next_proposal[i] = 0;
    }

    int free_count = N;

    while(free_count > 0) {
        int m;

        // Find free man
        for(m = 0; m < N; m++) {
            if(men_free[m])
                break;
        }

        int w = men_pref[m][next_proposal[m]];
        next_proposal[m]++;

        // If woman is free
        if(women_partner[w] == -1) {
            women_partner[w] = m;
            men_free[m] = 0;
            free_count--;
        }
        else {
            int m1 = women_partner[w];

            // Check preference
            int prefer_new = 0;
            for(int i = 0; i < N; i++) {
                if(women_pref[w][i] == m) {
                    prefer_new = 1;
                    break;
                }
                if(women_pref[w][i] == m1)
                    break;
            }

            // If woman prefers new man
            if(prefer_new) {
                women_partner[w] = m;
                men_free[m] = 0;
                men_free[m1] = 1;
            }
        }
    }

    // Print result
    printf("Stable Marriages:\n");
    char men_names[] = {'A','B','C'};
    char women_names[] = {'V','W','X'};

    for(int i = 0; i < N; i++) {
        printf("%c - %c\n", men_names[women_partner[i]], women_names[i]);
    }

    return 0;
}