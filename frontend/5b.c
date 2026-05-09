#include <stdio.h>

#define N 10

int main() {
    // Adjacency matrix (based on given graph)
    int graph[N][N] = {
        {0,1,1,0,0,0,0,0,0,0}, //1
        {1,0,1,1,1,0,0,0,0,0}, //2
        {1,1,0,0,0,1,1,0,0,0}, //3
        {0,1,0,0,1,0,0,1,1,0}, //4
        {0,1,0,1,0,0,0,0,1,0}, //5
        {0,0,1,0,0,0,1,0,0,0}, //6
        {0,0,1,0,0,1,0,0,0,0}, //7
        {0,0,0,1,0,0,0,0,1,0}, //8
        {0,0,0,1,1,0,0,1,0,1}, //9
        {0,0,0,0,0,0,0,0,1,0}  //10
    };

    int visited[N] = {0};
    int color[N];   // 0 = Blue, 1 = Red
    int queue[N];
    int front = 0, rear = 0;

    int source = 0; // node 1

    // Start BFS
    visited[source] = 1;
    color[source] = 0; // Blue
    queue[rear++] = source;

    printf("Node\tColor\n");

    while(front < rear) {
        int node = queue[front++];

        printf("%d\t%s\n", node+1, color[node] ? "Red" : "Blue");

        for(int i = 0; i < N; i++) {
            if(graph[node][i] && !visited[i]) {
                visited[i] = 1;
                color[i] = 1 - color[node]; // alternate color
                queue[rear++] = i;
            }
        }
    }

    return 0;
}