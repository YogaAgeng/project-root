<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create a predictable test user for manual API testing
        $testUser = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        // Create 4 additional users (total = 5)
        $otherUsers = User::factory(4)->create();
        $allUsers = $otherUsers->prepend($testUser);

        // Create 15 tasks distributed among users
        $tasks = collect();
        foreach ($allUsers as $user) {
            // Each user creates 3 tasks
            $createdTasks = Task::factory(3)
                ->createdBy($user)
                ->create()
                ->each(function (Task $task) use ($allUsers, $user) {
                    // Randomly assign some tasks to other users
                    if (fake()->boolean(60)) {
                        $assignee = $allUsers->where('id', '!=', $user->id)->random();
                        $task->update(['assigned_user_id' => $assignee->id]);
                    }
                });

            $tasks = $tasks->merge($createdTasks);
        }

        // Create 10 comments on random tasks by random users
        $allTasks = Task::all();
        TaskComment::factory(10)->create([
            'task_id' => fn () => $allTasks->random()->id,
            'user_id' => fn () => $allUsers->random()->id,
        ]);
    }
}
