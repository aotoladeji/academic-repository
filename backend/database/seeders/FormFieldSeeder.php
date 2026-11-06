<?php

namespace Database\Seeders;

use App\Models\FormField;
use Illuminate\Database\Seeder;

/** Starter dynamic fields; admins can change all of these from the UI. */
class FormFieldSeeder extends Seeder
{
    public function run(): void
    {
        $fields = [
            ['journal_name', 'Journal / conference name', 'text', true, null],
            ['publication_type', 'Publication type', 'select', true,
                ['Journal article', 'Conference paper', 'Book chapter', 'Book', 'Thesis']],
            ['keywords', 'Keywords', 'dynamic_list', false, null],
            ['indexing_database', 'Indexed in', 'select', false, ['Scopus', 'Web of Science', 'PubMed', 'Google Scholar', 'None']],
        ];

        foreach ($fields as $i => [$key, $label, $type, $required, $options]) {
            FormField::updateOrCreate(
                ['field_key' => $key],
                ['label' => $label, 'type' => $type, 'is_required' => $required, 'options' => $options,
                 'is_active' => true, 'sort_order' => $i + 1],
            );
        }
    }
}
