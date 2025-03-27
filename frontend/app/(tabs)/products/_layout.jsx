import { Stack } from "expo-router";

export default function ProductsLayout() {
    return (
        <Stack>
            <Stack.Screen 
                name="index" 
                options={{
                    headerShown: false,
                }} 
            />
            <Stack.Screen 
                name="communityy" 
                options={{
                    headerShown: false,
                }} 
            />
            <Stack.Screen 
                name="ask-question" 
                options={{
                    headerShown: false,
                }} 
            />
            <Stack.Screen 
                name="post-details" 
                options={{
                    headerShown: false,
                }} 
            />
        </Stack>
    );
}
