#include <stdio.h>
#define N 5
#define INF 9999

int main() {
    // Adjacency matrix
    int graph[N][N] = {
        {0,10,0,0,100},  //1
        {10,0,50,0,0},   //2
        {0,50,0,20,10},  //3
        {0,0,20,0,60},   //4
        {100,0,10,60,0}  //5
    };

    int dist[N], visited[N] = {0};

    // Initialize distances
    for(int i=0;i<N;i++) {
        dist[i] = INF;
    }

    int source = 0; // node 1
    dist[source] = 0;

    // Dijkstra
    for(int count=0; count<N-1; count++) {
        int min = INF, u;

        // Find minimum distance node
        for(int i=0;i<N;i++) {
            if(!visited[i] && dist[i] < min) {
                min = dist[i];
                u = i;
            }
        }

        visited[u] = 1;

        // Update distances
        for(int v=0; v<N; v++) {
            if(!visited[v] && graph[u][v] &&
               dist[u] + graph[u][v] < dist[v]) {
                dist[v] = dist[u] + graph[u][v];
            }
        }
    }

    // Output
    printf("Shortest distances from node 1:\n");
    for(int i=0;i<N;i++) {
        printf("1 -> %d = %d\n", i+1, dist[i]);
    }

    return 0;
}