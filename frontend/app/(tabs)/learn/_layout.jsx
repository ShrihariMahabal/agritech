import { Stack } from "expo-router";

export default function LearnLayout() {
    return (
        <Stack>
            <Stack.Screen 
                name="index" 
                options={{
                    headerShown: false,
                    headerTitle: 'Learn',
                    headerTitleAlign: 'center',
                    headerStyle: {
                        height: 80,
                    },
                    headerTitleStyle: {
                        fontSize: 18,
                        fontWeight: 'bold',
                    },
                }} 
            />
            <Stack.Screen 
                name="routescreen" 
                options={{
                    headerShown: false,
                    headerTitle: 'Available Routes',
                    headerTitleAlign: 'center',
                    headerStyle: {
                        height: 80,
                    },
                    headerTitleStyle: {
                        fontSize: 18,
                        fontWeight: 'bold',
                    },
                }} 
            />
        </Stack>
    );
}
