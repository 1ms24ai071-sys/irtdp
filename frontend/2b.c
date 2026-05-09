#include <stdio.h>

#define N 5

int main() {
    // Adjacency matrix for graph (1 to 5)
    int graph[N][N] = {
        //1  2  3  4  5
        {0, 1, 1, 1, 0}, // 1 -> 2,3,4
        {0, 0, 1, 0, 1}, // 2 -> 3,5
        {0, 0, 0, 1, 1}, // 3 -> 4,5
        {0, 0, 1, 0, 1}, // 4 -> 3,5
        {0, 0, 0, 0, 0}  // 5
    };

    int visited[N] = {0};
    int queue[N];
    int front = 0, rear = 0;

    int source = 0; // Node 1 (index 0)

    // Start BFS
    visited[source] = 1;
    queue[rear++] = source;

    printf("Reachable nodes from node 1:\n");

    while(front < rear) {
        int node = queue[front++];
        printf("%d ", node + 1);

        for(int i = 0; i < N; i++) {
            if(graph[node][i] == 1 && visited[i] == 0) {
                visited[i] = 1;
                queue[rear++] = i;
            }
        }
    }

    return 0;
}