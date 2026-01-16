/**
 * Course Analytics Module
 * 
 * Syncs courses from Whop API and calculates completion rates.
 */

import { db } from '@/lib/db';
import { courses, courseProgress, members } from '@/lib/db/schema';
import { whopClient } from '@/lib/whop/client';
import { eq, and, sql } from 'drizzle-orm';

export interface CourseAnalytics {
    courseId: string;
    title: string;
    lessonCount: number;
    enrolledCount: number;
    completedCount: number;
    completionRate: number;
    averageProgress: number;
}

/**
 * Sync courses from Whop API
 */
export async function syncCourses(companyId: string, userId: string): Promise<void> {
    try {
        console.log('[Courses] Syncing courses for company:', companyId);

        // Fetch courses from Whop API
        const response = await whopClient.courses.list({
            company_id: companyId
        }) as any;

        const courseList = response.data || [];
        console.log(`[Courses] Found ${courseList.length} courses`);

        for (const course of courseList) {
            // Upsert course
            const existing = await db.query.courses.findFirst({
                where: and(
                    eq(courses.userId, userId),
                    eq(courses.whopCourseId, course.id)
                )
            });

            if (existing) {
                await db.update(courses)
                    .set({
                        title: course.title || course.name,
                        description: course.description,
                        lessonCount: course.lesson_count || course.lessons_count || 0,
                        updatedAt: new Date()
                    })
                    .where(eq(courses.id, existing.id));
            } else {
                await db.insert(courses).values({
                    userId,
                    whopCourseId: course.id,
                    title: course.title || course.name,
                    description: course.description,
                    lessonCount: course.lesson_count || course.lessons_count || 0,
                    isPublished: course.is_published !== false
                });
            }
        }

        console.log('[Courses] Sync complete');
    } catch (error) {
        console.error('[Courses] Sync error:', error);
        // Don't throw - course sync is optional
    }
}

/**
 * Update course progress for a member
 */
export async function updateCourseProgress(
    userId: string,
    memberId: string,
    courseId: string,
    lessonsCompleted: number,
    totalLessons: number
): Promise<void> {
    try {
        // Find the course record
        const course = await db.query.courses.findFirst({
            where: and(
                eq(courses.userId, userId),
                eq(courses.whopCourseId, courseId)
            )
        });

        if (!course) {
            console.log('[Courses] Course not found:', courseId);
            return;
        }

        // Find the member record
        const member = await db.query.members.findFirst({
            where: and(
                eq(members.userId, userId),
                eq(members.whopMemberId, memberId)
            )
        });

        if (!member) {
            console.log('[Courses] Member not found:', memberId);
            return;
        }

        const progressPercent = totalLessons > 0
            ? (lessonsCompleted / totalLessons) * 100
            : 0;

        const isCompleted = lessonsCompleted >= totalLessons && totalLessons > 0;

        // Upsert progress
        const existingProgress = await db.query.courseProgress.findFirst({
            where: and(
                eq(courseProgress.memberId, member.id),
                eq(courseProgress.courseId, course.id)
            )
        });

        if (existingProgress) {
            await db.update(courseProgress)
                .set({
                    lessonsCompleted,
                    totalLessons,
                    progressPercent: progressPercent.toString(),
                    completedAt: isCompleted ? new Date() : null,
                    lastAccessedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(courseProgress.id, existingProgress.id));
        } else {
            await db.insert(courseProgress).values({
                userId,
                courseId: course.id,
                memberId: member.id,
                lessonsCompleted,
                totalLessons,
                progressPercent: progressPercent.toString(),
                completedAt: isCompleted ? new Date() : null,
                lastAccessedAt: new Date()
            });
        }

        console.log(`[Courses] Updated progress: ${progressPercent}% for member ${memberId}`);
    } catch (error) {
        console.error('[Courses] Progress update error:', error);
    }
}

/**
 * Get course analytics for a user
 */
export async function getCourseAnalytics(userId: string): Promise<CourseAnalytics[]> {
    try {
        // Get all courses for this user
        const userCourses = await db.query.courses.findMany({
            where: eq(courses.userId, userId)
        });

        const analytics: CourseAnalytics[] = [];

        for (const course of userCourses) {
            // Get progress stats for this course
            const stats = await db
                .select({
                    enrolledCount: sql<number>`count(*)`,
                    completedCount: sql<number>`count(case when ${courseProgress.completedAt} is not null then 1 end)`,
                    avgProgress: sql<number>`coalesce(avg(${courseProgress.progressPercent}), 0)`
                })
                .from(courseProgress)
                .where(eq(courseProgress.courseId, course.id));

            const stat = stats[0] || { enrolledCount: 0, completedCount: 0, avgProgress: 0 };

            analytics.push({
                courseId: course.whopCourseId,
                title: course.title || 'Untitled Course',
                lessonCount: course.lessonCount || 0,
                enrolledCount: Number(stat.enrolledCount || 0),
                completedCount: Number(stat.completedCount || 0),
                completionRate: stat.enrolledCount > 0
                    ? (Number(stat.completedCount) / Number(stat.enrolledCount)) * 100
                    : 0,
                averageProgress: Number(stat.avgProgress || 0)
            });
        }

        // Sort by completion rate (show low performers first for action items)
        return analytics.sort((a, b) => a.completionRate - b.completionRate);
    } catch (error) {
        console.error('[Courses] Analytics error:', error);
        return [];
    }
}
