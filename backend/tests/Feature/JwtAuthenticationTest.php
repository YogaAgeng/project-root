<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JwtAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_and_receive_jwt_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email'],
                'token',
            ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'The provided credentials are incorrect.',
            ]);
    }

    public function test_unauthenticated_request_returns_json_401_without_html_redirect(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_authenticated_user_can_access_me_and_logout(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $token = $loginResponse->json('token');

        // Test GET /api/auth/me
        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        $meResponse->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
            ]);

        // Test POST /api/auth/logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson([
                'message' => 'Logged out successfully.',
            ]);
    }

    public function test_anti_idor_policies_remain_functional_with_jwt(): void
    {
        $creator = User::factory()->create();
        $stranger = User::factory()->create();

        $task = Task::factory()->create([
            'created_by' => $creator->id,
            'assigned_user_id' => null,
        ]);

        // Stranger logs in via JWT
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $stranger->email,
            'password' => 'password',
        ]);
        $strangerToken = $loginResponse->json('token');

        // Stranger tries to delete creator's task -> 403 Forbidden
        $deleteResponse = $this->withHeader('Authorization', 'Bearer ' . $strangerToken)
            ->deleteJson("/api/tasks/{$task->id}");

        $deleteResponse->assertStatus(403);
    }
}
