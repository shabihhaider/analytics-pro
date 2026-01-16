'use client';

import { BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface CourseData {
    courseId: string;
    title: string;
    lessonCount: number;
    enrolledCount: number;
    completedCount: number;
    completionRate: number;
    averageProgress: number;
}

interface CourseAnalyticsCardProps {
    courses: CourseData[];
    loading?: boolean;
}

export function CourseAnalyticsCard({ courses, loading }: CourseAnalyticsCardProps) {
    if (loading) {
        return (
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Course Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-16 bg-white/10 rounded" />
                        <div className="h-16 bg-white/10 rounded" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!courses || courses.length === 0) {
        return (
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Course Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6">
                        <BookOpen className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">
                            No courses found. Click Sync to fetch course data.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-400" />
                    Course Performance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {courses.map((course) => {
                    const isLowPerformer = course.completionRate < 30;
                    const isHighPerformer = course.completionRate >= 70;

                    return (
                        <div
                            key={course.courseId}
                            className={`p-3 rounded-lg border ${isLowPerformer ? 'border-red-500/30 bg-red-500/5' :
                                    isHighPerformer ? 'border-green-500/30 bg-green-500/5' :
                                        'border-white/10 bg-white/5'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {isLowPerformer ? (
                                        <AlertTriangle className="h-4 w-4 text-red-400" />
                                    ) : isHighPerformer ? (
                                        <CheckCircle className="h-4 w-4 text-green-400" />
                                    ) : (
                                        <BookOpen className="h-4 w-4 text-blue-400" />
                                    )}
                                    <span className="text-sm font-medium text-white truncate max-w-[200px]">
                                        {course.title}
                                    </span>
                                </div>
                                <span className={`text-sm font-bold ${isLowPerformer ? 'text-red-400' :
                                        isHighPerformer ? 'text-green-400' :
                                            'text-blue-400'
                                    }`}>
                                    {course.completionRate.toFixed(0)}%
                                </span>
                            </div>

                            <Progress
                                value={course.completionRate}
                                className="h-2 bg-white/10"
                            />

                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                                <span>{course.enrolledCount} enrolled</span>
                                <span>{course.completedCount} completed</span>
                            </div>
                        </div>
                    );
                })}

                {/* Action hint for low performers */}
                {courses.some(c => c.completionRate < 30) && (
                    <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded border border-yellow-500/30">
                        💡 Courses with &lt;30% completion may need improvement. Consider adding more engaging content.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
